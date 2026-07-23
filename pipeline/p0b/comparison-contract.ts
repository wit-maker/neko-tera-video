/**
 * P0b working comparison contract. It is intentionally PROPOSED and scoped to
 * the comparison PoC; it is neither an ADR nor a public adapter API.
 */
export const P0B_CONTRACT_STATUS = "PROPOSED" as const;
export const P0B_CONTRACT_SCOPE = "P0b working comparison contract" as const;

export const BASE_REPRESENTATIONS = ["A", "B1", "B2", "C", "D", "E"] as const;
export const ENHANCEMENT_LAYERS = ["X0", "X1", "X2", "X3"] as const;
export type BaseRepresentation = (typeof BASE_REPRESENTATIONS)[number];
export type EnhancementLayer = (typeof ENHANCEMENT_LAYERS)[number];
export type SupportStatus = "required" | "optional" | "unsupported";

interface HalfOpenFrameRange {
  startFrame: number;
  endFrameExclusive: number;
}

type TimeScope =
  | { kind: "single-frame"; frame: number }
  | ({ kind: "interval" } & HalfOpenFrameRange);

export interface ObservableReference {
  id: string;
  support: SupportStatus;
  measurement: { method: string; version: string };
  coordinateSpace: string;
  tolerance?: string;
  comparisonMethod?: string;
  confidence: number;
  manualAnnotation: { required: boolean; instructions: string };
  timeScope: TimeScope;
}

export interface AdapterNativeAssetContract {
  base: BaseRepresentation;
  nativeAssetRequirements: string[];
  prohibitedSharedAssumptions: readonly ["shared-completed-png", "shared-topology", "shared-bones"];
  nativeControls: string[];
}

export interface P0bComparisonContract {
  status: typeof P0B_CONTRACT_STATUS;
  scope: typeof P0B_CONTRACT_SCOPE;
  characterBible: {
    identityConstraints: string[];
    referenceConstraints: string[];
    prohibitedSharedDeliverables: string[];
  };
  performanceIntent: { id: string; description: string; timebase: { fps: number } & HalfOpenFrameRange };
  observableReferences: ObservableReference[];
  adapters: AdapterNativeAssetContract[];
  candidateSpace: { base: BaseRepresentation[]; enhancement: EnhancementLayer[] };
  artifactContract: {
    timebase: { fps: number } & HalfOpenFrameRange;
    color: string;
    alpha: string;
    camera: string;
    crop: string;
    provenance: string[];
    effortLog: string[];
    knownFailure: string[];
    presentation: readonly ["normal", "slow", "crop", "debug", "still"];
  };
  conformance: { status: "not-run" | "pass" | "fail"; checks: string[] };
  evaluation: { status: "evaluated" | "not-evaluated"; observations: string[]; representationDecision: "not-made" };
  p0aEvidence: { pullRequest: string; artifactPath: string; sha256: string };
}

const isBase = (value: unknown): value is BaseRepresentation =>
  typeof value === "string" && (BASE_REPRESENTATIONS as readonly string[]).includes(value);
const isEnhancement = (value: unknown): value is EnhancementLayer =>
  typeof value === "string" && (ENHANCEMENT_LAYERS as readonly string[]).includes(value);

/** Returns every contract violation without making a quality or selection decision. */
export function validateP0bContract(contract: P0bComparisonContract): string[] {
  const errors: string[] = [];
  const validateTimebase = (label: string, timebase: { fps: number } & HalfOpenFrameRange) => {
    if (timebase.fps !== 60 || timebase.startFrame !== 0 || timebase.endFrameExclusive !== 619) {
      errors.push(`${label} must be the explicit half-open 619-frame range [0, 619) at 60 fps`);
    }
  };
  if (contract.status !== "PROPOSED" || contract.scope !== "P0b working comparison contract") errors.push("contract must remain the P0b PROPOSED working contract");
  validateTimebase("performance intent timebase", contract.performanceIntent.timebase);
  validateTimebase("artifact timebase", contract.artifactContract.timebase);
  if (contract.characterBible.prohibitedSharedDeliverables.length === 0) errors.push("character bible must prohibit forced shared deliverables");
  if (contract.candidateSpace.base.some((base) => !isBase(base))) errors.push("candidate base contains a non-base representation");
  if (contract.candidateSpace.enhancement.some((enhancement) => !isEnhancement(enhancement))) errors.push("candidate enhancement contains a non-enhancement layer");
  if (contract.candidateSpace.base.some((base) => isEnhancement(base))) errors.push("an enhancement must not be treated as a base");
  for (const observable of contract.observableReferences) {
    if (!observable.id || !["required", "optional", "unsupported"].includes(observable.support)) errors.push(`observable ${observable.id || "<missing>"} has invalid support status`);
    if (!observable.measurement.method || !observable.measurement.version) errors.push(`observable ${observable.id} lacks measurement method/version`);
    if (!observable.coordinateSpace) errors.push(`observable ${observable.id} lacks coordinate space`);
    if (!observable.tolerance && !observable.comparisonMethod) errors.push(`observable ${observable.id} needs tolerance or comparison method`);
    if (observable.confidence < 0 || observable.confidence > 1) errors.push(`observable ${observable.id} has invalid confidence`);
    if (typeof observable.manualAnnotation.required !== "boolean" || !observable.manualAnnotation.instructions) errors.push(`observable ${observable.id} lacks manual annotation declaration`);
    const time = observable.timeScope;
    if (time.kind === "single-frame" && !Number.isInteger(time.frame)) errors.push(`observable ${observable.id} has invalid single-frame scope`);
    if (time.kind === "interval" && (!Number.isInteger(time.startFrame) || !Number.isInteger(time.endFrameExclusive) || time.endFrameExclusive <= time.startFrame || time.startFrame < 0 || time.endFrameExclusive > 619)) errors.push(`observable ${observable.id} has invalid half-open interval scope`);
    if (time.kind === "single-frame" && (time.frame < 0 || time.frame >= 619)) errors.push(`observable ${observable.id} falls outside the half-open P0b timebase`);
  }
  for (const adapter of contract.adapters) {
    if (!isBase(adapter.base)) errors.push("adapter must declare a Base A/B1/B2/C/D/E");
    if (adapter.nativeAssetRequirements.length === 0 || adapter.nativeControls.length === 0) errors.push(`adapter ${adapter.base} lacks native asset/control requirements`);
    if (adapter.prohibitedSharedAssumptions.join(",") !== "shared-completed-png,shared-topology,shared-bones") errors.push(`adapter ${adapter.base} must prohibit forced shared PNG/topology/bones`);
  }
  if (contract.artifactContract.presentation.join(",") !== "normal,slow,crop,debug,still") errors.push("presentation must contain normal/slow/crop/debug/still");
  if (!["not-run", "pass", "fail"].includes(contract.conformance.status)) errors.push("conformance status must be not-run, pass, or fail");
  if (contract.conformance.status === "pass" && contract.evaluation.representationDecision !== "not-made") errors.push("conformance pass must not infer a quality or representation decision");
  if (!contract.p0aEvidence.pullRequest.includes("/pull/19") || !contract.p0aEvidence.artifactPath || !/^[A-F0-9]{64}$/.test(contract.p0aEvidence.sha256)) errors.push("P0a evidence link/path/SHA-256 is incomplete");
  return errors;
}

const observable = (id: string, support: SupportStatus, timeScope: TimeScope): ObservableReference => ({
  id,
  support,
  measurement: { method: "manual-review-checklist", version: "p0b-v0.1" },
  coordinateSpace: "output-raster-1080x1920",
  tolerance: "reviewer-recorded; no aggregate quality score",
  confidence: 0.8,
  manualAnnotation: { required: true, instructions: "Record observation and uncertainty per artifact." },
  timeScope,
});

const adapter = (base: BaseRepresentation, asset: string, control: string): AdapterNativeAssetContract => ({
  base,
  nativeAssetRequirements: [asset],
  prohibitedSharedAssumptions: ["shared-completed-png", "shared-topology", "shared-bones"],
  nativeControls: [control],
});

export const P0B_WORKING_CONTRACT: P0bComparisonContract = {
  status: P0B_CONTRACT_STATUS,
  scope: P0B_CONTRACT_SCOPE,
  characterBible: {
    identityConstraints: ["silhouette", "fur markings", "muzzle identity", "oral cavity readability"],
    referenceConstraints: ["approved camera/output framing", "same performance intent"],
    prohibitedSharedDeliverables: ["shared completed PNG", "shared topology", "shared bones"],
  },
  performanceIntent: { id: "p1-mechanism-intent-draft", description: "Expose mouth, muzzle, cheek, occlusion, and temporal continuity without assigning a quality rank.", timebase: { fps: 60, startFrame: 0, endFrameExclusive: 619 } },
  observableReferences: [
    observable("jaw-lip-corner", "required", { kind: "interval", startFrame: 0, endFrameExclusive: 619 }),
    observable("muzzle-cheek-occlusion", "required", { kind: "interval", startFrame: 0, endFrameExclusive: 619 }),
    observable("oral-cavity", "optional", { kind: "single-frame", frame: 309 }),
    observable("unsupported-example", "unsupported", { kind: "single-frame", frame: 0 }),
  ],
  adapters: [
    adapter("A", "existing local mouth-patch assets", "existing viseme selection"),
    adapter("B1", "discrete full-head state assets", "state transition"),
    adapter("B2", "hand-drawn/vector key drawings", "exposure timeline"),
    adapter("C", "2D layers, masks, and deformer inputs", "mesh/deformer parameters"),
    adapter("D", "2.5D geometry and facial rig inputs", "jaw/muzzle rig controls"),
    adapter("E", "3D mesh, textures, and facial rig inputs", "3D facial controls"),
  ],
  candidateSpace: { base: ["A", "B1", "B2", "C", "D", "E"], enhancement: ["X0", "X1", "X2", "X3"] },
  artifactContract: {
    timebase: { fps: 60, startFrame: 0, endFrameExclusive: 619 }, color: "declared output color space", alpha: "declared opaque/premultiplied handling", camera: "declared camera and view", crop: "declared crop coordinates", provenance: ["source commit", "input hash", "tool version"], effortLog: ["track", "hours", "iteration reason"], knownFailure: ["failure id", "scope", "evidence"], presentation: ["normal", "slow", "crop", "debug", "still"],
  },
  conformance: { status: "not-run", checks: ["future artifact conformance checks"] },
  evaluation: { status: "not-evaluated", observations: [], representationDecision: "not-made" },
  p0aEvidence: { pullRequest: "https://github.com/wit-maker/neko-tera-video/pull/19", artifactPath: "out/p0/a-s7c6-e43ebb2", sha256: "6353866D986A2C70E5956EAC0C6B3CA22DD686592C51CFFBB77FB64039BDA561" },
};
