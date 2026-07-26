/**
 * M3-06 acceptance check over the manifest the Blender build emits.
 *
 * The card requires jaw, lips, corners, muzzle, cheek, oral cavity and occlusion
 * controls. D's occlusion claim is geometric: the interior sits behind the jaw
 * and muzzle plates in depth, so it is hidden by geometry rather than by a 2D
 * mask. That is checkable from the manifest, and it is checked here.
 */

export const REQUIRED_BONES = ["jaw", "lip-corner-L", "lip-corner-R", "muzzle", "cheek-L", "cheek-R"] as const;
export const REQUIRED_PLATES = [
  "head-plate", "cheek-far", "cheek-near", "oral-cavity", "tongue",
  "teeth-upper", "teeth-lower", "jaw-plate", "muzzle-plate", "nose",
] as const;
export const INTERIOR_PLATES = ["oral-cavity", "tongue", "teeth-upper", "teeth-lower"] as const;

export interface DPlate {
  name: string;
  depthY: number;
  vertexCount: number;
  isVolume: boolean;
  vertexGroups: string[];
  worldBounds: DWorldBounds;
}

export interface DWorldBounds {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

export interface DOcclusionPair {
  interior: string;
  occluder: string;
  interiorBehindOccluder: boolean;
  /** Separation between the interior's nearest face and the occluder's furthest. */
  depthGap: number;
  /** The same figure from object origins, kept so the two can be compared. */
  originDepthGap: number;
  screenOverlapX: number;
  screenOverlapZ: number;
  screenOverlaps: boolean;
  measuredFrom: string;
}

export interface DManifest {
  schemaVersion: string;
  task: string;
  base: string;
  status: string;
  mechanismClass: string;
  blenderVersion: string;
  externalAssetInputs: string[];
  addonsInstalledByThisTask: string[];
  renderPerformed: boolean;
  plates: DPlate[];
  bones: string[];
  shapeKeys: Record<string, string[]>;
  occlusion: DOcclusionPair[];
  evaluation: { qualityRanking: string; representationDecision: string };
}

export function validateDManifest(manifest: DManifest): string[] {
  const errors: string[] = [];

  if (manifest.schemaVersion !== "m3-d-native-asset-manifest-v1") errors.push("unrecognised D manifest schema");
  if (manifest.task !== "M3-06" || manifest.base !== "D") errors.push("manifest must identify itself as M3-06 Base D");
  if (manifest.status !== "PROPOSED") errors.push("D must remain a PROPOSED PoC asset");
  if (manifest.renderPerformed) errors.push("M3-06 authors an asset; it must not render");
  if (manifest.externalAssetInputs.length > 0) errors.push("D must consume no external asset input");
  if (manifest.addonsInstalledByThisTask.length > 0) errors.push("M3-06 must install no add-on");
  if (manifest.evaluation.qualityRanking !== "not-made" || manifest.evaluation.representationDecision !== "not-made") {
    errors.push("authoring an asset must not carry a quality ranking or a representation decision");
  }

  const plates = new Map(manifest.plates.map((plate) => [plate.name, plate]));
  for (const name of REQUIRED_PLATES) if (!plates.has(name)) errors.push(`D is missing the ${name} plate`);
  for (const plate of manifest.plates) {
    // 2.5D means shallow layered geometry. A volume here would make it E.
    if (plate.isVolume) errors.push(`plate ${plate.name} is a volume; D is shallow layered geometry`);
    if (plate.vertexCount < 4) errors.push(`plate ${plate.name} carries too few vertices to deform`);
  }

  for (const bone of REQUIRED_BONES) if (!manifest.bones.includes(bone)) errors.push(`D is missing the ${bone} control`);

  // Muzzle, cheek and tongue volume must be driven, not implied.
  const keys = Object.values(manifest.shapeKeys).flat();
  for (const key of ["muzzleRound", "cheekPuff", "tongueRaise"]) {
    if (!keys.includes(key)) errors.push(`D is missing the ${key} volume control`);
  }

  // The jaw must actually drive the lower group, or the hinge is decorative.
  for (const name of ["jaw-plate", "teeth-lower", "tongue", "oral-cavity"]) {
    if (!plates.get(name)?.vertexGroups.includes("jaw")) errors.push(`${name} must be bound to the jaw control`);
  }
  // And it must not drive the skull-parented upper dentition.
  if (plates.get("teeth-upper")?.vertexGroups.includes("jaw")) errors.push("teeth-upper is skull-parented and must not follow the jaw");

  // Occlusion, the property that distinguishes D from a 2D mask.
  if (manifest.occlusion.length !== INTERIOR_PLATES.length * 2) errors.push("every interior plate must be checked against both occluders");
  for (const pair of manifest.occlusion) {
    if (!pair.interiorBehindOccluder) errors.push(`${pair.interior} is not behind ${pair.occluder}; D's occlusion would not be geometric`);
    if (pair.depthGap <= 0) errors.push(`${pair.interior} has no depth separation from ${pair.occluder}`);
    // Depth order alone occludes nothing. A plate behind another but offset to
    // one side is simply visible beside it, so the shapes must also overlap on
    // screen. This is measured from evaluated world bounds rather than from the
    // origins the build script wrote, which could only confirm its own intent.
    if (!pair.screenOverlaps || pair.screenOverlapX <= 0 || pair.screenOverlapZ <= 0) {
      errors.push(`${pair.interior} does not overlap ${pair.occluder} on screen; being behind it would occlude nothing`);
    }
    if (!pair.measuredFrom.includes("world-space bounds")) errors.push(`${pair.interior} occlusion must be measured from evaluated world bounds`);
  }
  for (const plate of manifest.plates) {
    if (!plate.worldBounds) errors.push(`plate ${plate.name} has no measured world bounds`);
  }

  return errors;
}
