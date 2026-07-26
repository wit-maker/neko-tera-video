/**
 * M3-08 acceptance check over the manifest the Blender build emits.
 *
 * The card requires E-specific controls and camera/view behaviour expressed in
 * the asset. Two things separate E from D and both are checked here rather than
 * described: every mesh is a closed volume, and the rig is a real hierarchy in
 * which the jaw inherits from the skull instead of being an independent plate.
 */

/** Adopted comparison range, ADR-001 / GOV-013. */
export const VIEW_LIMITS = { yawDegrees: 15, pitchDegrees: 10 } as const;
export const REQUIRED_VOLUMES = [
  "skull", "muzzle", "jaw", "cheek-L", "cheek-R", "oral-cavity",
  "tongue", "teeth-upper", "teeth-lower", "nose", "ear-L", "ear-R",
] as const;
export const REQUIRED_HIERARCHY: Record<string, string | null> = {
  root: null, skull: "root", jaw: "skull", muzzle: "skull",
  "lip-corner-L": "jaw", "lip-corner-R": "jaw", tongue: "jaw",
  "cheek-L": "skull", "cheek-R": "skull",
};

export interface EWorldBounds {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

export interface EVolume {
  name: string;
  vertexCount: number;
  closed: boolean;
  boundaryEdges: number;
  volume: number;
  vertexGroups: string[];
  worldBounds: EWorldBounds;
}

export interface EContainment {
  interior: string;
  container: string;
  insideContainer: boolean;
  measuredFrom: string;
}

export interface EManifest {
  schemaVersion: string;
  task: string;
  base: string;
  status: string;
  mechanismClass: string;
  blenderVersion: string;
  externalAssetInputs: string[];
  addonsInstalledByThisTask: string[];
  renderPerformed: boolean;
  volumes: EVolume[];
  interiorVolumes: string[];
  interiorContainment: EContainment[];
  boneHierarchy: Record<string, string | null>;
  correctiveShapes: Record<string, string[]>;
  view: {
    pivot: string;
    camera: string;
    projection: string;
    yawLimitDegrees: number;
    pitchLimitDegrees: number;
    limitConstraints: string[];
    authoredInAsset: boolean;
  };
  evaluation: { qualityRanking: string; representationDecision: string };
}

export function validateEManifest(manifest: EManifest): string[] {
  const errors: string[] = [];

  if (manifest.schemaVersion !== "m3-e-native-asset-manifest-v1") errors.push("unrecognised E manifest schema");
  if (manifest.task !== "M3-08" || manifest.base !== "E") errors.push("manifest must identify itself as M3-08 Base E");
  if (manifest.status !== "PROPOSED") errors.push("E must remain a PROPOSED PoC asset");
  if (manifest.renderPerformed) errors.push("M3-08 authors an asset; it must not render");
  if (manifest.externalAssetInputs.length > 0) errors.push("E must consume no external asset input");
  if (manifest.addonsInstalledByThisTask.length > 0) errors.push("M3-08 must install no add-on");
  if (manifest.evaluation.qualityRanking !== "not-made" || manifest.evaluation.representationDecision !== "not-made") {
    errors.push("authoring an asset must not carry a quality ranking or a representation decision");
  }

  const volumes = new Map(manifest.volumes.map((volume) => [volume.name, volume]));
  for (const name of REQUIRED_VOLUMES) if (!volumes.has(name)) errors.push(`E is missing the ${name} volume`);
  for (const volume of manifest.volumes) {
    // Closed with positive volume is exactly what makes this E rather than D.
    if (!volume.closed || volume.boundaryEdges > 0) errors.push(`${volume.name} is not a closed volume; E is full 3D, not a plate stack`);
    if (volume.volume <= 0) errors.push(`${volume.name} encloses no volume`);
  }

  // A real hierarchy: the jaw inherits from the skull rather than floating.
  for (const [bone, parent] of Object.entries(REQUIRED_HIERARCHY)) {
    if (!(bone in manifest.boneHierarchy)) errors.push(`E is missing the ${bone} bone`);
    else if (manifest.boneHierarchy[bone] !== parent) {
      errors.push(`${bone} must be parented to ${parent ?? "nothing"}, not ${manifest.boneHierarchy[bone] ?? "nothing"}`);
    }
  }

  // Binding, with the same skull/jaw split the other bases use.
  for (const name of ["jaw", "teeth-lower", "oral-cavity"]) {
    if (!volumes.get(name)?.vertexGroups.includes("jaw")) errors.push(`${name} must be bound to the jaw`);
  }
  if (volumes.get("teeth-upper")?.vertexGroups.includes("jaw")) errors.push("teeth-upper is skull-parented and must not follow the jaw");

  // E's claim is interior space. That only holds if the interior is actually
  // inside the skull, measured from the mesh rather than from the numbers the
  // build script wrote. Nothing checked this before; AP-012 applied to E.
  if (manifest.interiorContainment.length !== manifest.interiorVolumes.length) errors.push("every interior volume must be checked for containment");
  for (const entry of manifest.interiorContainment) {
    if (!entry.insideContainer) errors.push(`${entry.interior} is not inside the ${entry.container}; E would not have interior space there`);
    if (!entry.measuredFrom.includes("world-space bounds")) errors.push(`${entry.interior} containment must be measured from evaluated world bounds`);
  }
  for (const volume of manifest.volumes) {
    if (!volume.worldBounds) errors.push(`volume ${volume.name} has no measured world bounds`);
  }

  const correctives = Object.values(manifest.correctiveShapes).flat();
  if (!correctives.includes("jawOpen_corrective")) errors.push("E is missing the jaw-open corrective shape");
  if (!correctives.includes("lipRound_corrective")) errors.push("E is missing the lip-round corrective shape");

  // Camera and view behaviour must live in the asset, per the card.
  const view = manifest.view;
  if (!view.authoredInAsset) errors.push("E must express camera/view behaviour in the asset, not as a render-time argument");
  if (!view.pivot || !view.camera) errors.push("E must carry a view pivot and a comparison camera");
  if (view.yawLimitDegrees !== VIEW_LIMITS.yawDegrees) errors.push("the authored yaw limit must be the adopted +/-15 comparison range");
  if (view.pitchLimitDegrees !== VIEW_LIMITS.pitchDegrees) errors.push("the authored pitch limit must be the adopted +/-10 comparison range");
  if (view.limitConstraints.length < 2) errors.push("the view pivot must carry both a yaw and a pitch limit constraint");

  return errors;
}
