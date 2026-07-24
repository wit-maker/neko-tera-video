import definition from "./p1-track-a-run-definition.json";
import blenderReceipt from "./blender-tool-receipt.json";

export const CORE_BASES = ["A", "C", "D", "E"] as const;
export const CORE_SEQUENCE_IDS = ["T0", "T1", "T3", "T6", "T7", "T9"] as const;
export const B2_SEQUENCE_IDS = ["T1", "T3", "T8"] as const;
const REQUIRED_PROHIBITIONS = ["render", "native-asset-creation", "external-asset", "new-dependency", "addon", "cloud", "paid-service", "firewall-rule-change", "P2", "P3", "P4"] as const;

type Budget = { operatorHours: number; nativeAssetRevisionsMax: number; finalRenderAttemptsMax: number };
type Candidate = { base: string; role: string; sequenceIds: string[]; budget: Budget; toolReceipt?: string };
type RunDefinition = {
  schemaVersion: string; task: string; status: string; scope: string; track: string; trackB: { inScope: boolean };
  execution: { mode: string; realtimeEvaluation: boolean }; candidates: Candidate[];
  viewConstraints: { T7: { yawDegrees: { min: number; max: number }; pitchDegrees: { min: number; max: number } } };
  renderNetworkPrecondition: { requiredBeforeRender: boolean; acceptedEvidence: string; enforcementConfiguredInM300: boolean; renderPermittedByThisTask: boolean };
  conformance: { status: string; checks: string[] }; evaluation: { status: string; qualityRanking: string; representationDecision: string };
  m300ExecutionProhibitions: string[];
};

export const P1_TRACK_A_RUN_DEFINITION = definition as RunDefinition;
const sameValues = (actual: readonly string[], expected: readonly string[]) => actual.length === expected.length && actual.every((value, index) => value === expected[index]);
const sameBudget = (actual: Budget, expected: Budget) => actual.operatorHours === expected.operatorHours && actual.nativeAssetRevisionsMax === expected.nativeAssetRevisionsMax && actual.finalRenderAttemptsMax === expected.finalRenderAttemptsMax;

/** Validates M3-00's fixed PoC scope; it does not authorise a render or a decision. */
export function validateP1TrackARunDefinition(run: RunDefinition): string[] {
  const errors: string[] = [];
  if (run.schemaVersion !== "m3-p1-track-a-run-definition-v1" || run.task !== "M3-00" || run.status !== "PROPOSED") errors.push("run definition must remain the M3-00 PROPOSED PoC contract");
  if (run.track !== "A" || run.trackB.inScope) errors.push("M3-00 must fix Track A and exclude Track B");
  if (run.execution.mode !== "pre-render-only" || run.execution.realtimeEvaluation) errors.push("P1 must remain pre-render-only without realtime evaluation");
  const byBase = new Map(run.candidates.map((candidate) => [candidate.base, candidate]));
  if (byBase.size !== 6 || !["A", "B1", "B2", "C", "D", "E"].every((base) => byBase.has(base))) errors.push("candidate set must be exactly A/B1/B2/C/D/E");
  const coreBudget = { operatorHours: 8, nativeAssetRevisionsMax: 2, finalRenderAttemptsMax: 2 };
  for (const base of CORE_BASES) {
    const candidate = byBase.get(base);
    if (!candidate || candidate.role !== "core" || !sameValues(candidate.sequenceIds, CORE_SEQUENCE_IDS)) errors.push(`${base} must be a core candidate with T0/T1/T3/T6/T7/T9`);
    if (candidate && !sameBudget(candidate.budget, coreBudget)) errors.push(`${base} must use the fixed core Track A budget`);
  }
  const b1 = byBase.get("B1");
  if (!b1 || b1.role !== "state-transition-boundary" || b1.sequenceIds.length !== 0) errors.push("B1 must be limited to the state-increase/transition boundary");
  const b2 = byBase.get("B2");
  if (!b2 || b2.role !== "quality-ceiling-control" || !sameValues(b2.sequenceIds, B2_SEQUENCE_IDS)) errors.push("B2 must be limited to the T1/T3/T8 quality-ceiling control");
  for (const base of ["B1", "B2"]) {
    const candidate = byBase.get(base);
    if (candidate && !sameBudget(candidate.budget, { operatorHours: 4, nativeAssetRevisionsMax: 1, finalRenderAttemptsMax: 1 })) errors.push(`${base} must use the fixed B Track A budget`);
  }
  for (const base of ["D", "E"]) {
    const candidate = byBase.get(base);
    if (!candidate || candidate.toolReceipt !== "pipeline/m3/blender-tool-receipt.json") errors.push(`${base} must reference the accepted Blender receipt`);
  }
  if (blenderReceipt.portableDistribution.version !== "4.5.0" || blenderReceipt.checks.renderExecuted || blenderReceipt.checks.newDependencyAdded || blenderReceipt.checks.addonInstalled) errors.push("Blender receipt must remain the accepted 4.5 portable non-render/no-addon receipt");
  const t7 = run.viewConstraints.T7;
  if (t7.yawDegrees.min !== -15 || t7.yawDegrees.max !== 15 || t7.pitchDegrees.min !== -10 || t7.pitchDegrees.max !== 10) errors.push("T7 must fix yaw [-15, +15] and pitch [-10, +10]");
  const network = run.renderNetworkPrecondition;
  if (!network.requiredBeforeRender || !network.acceptedEvidence.includes("blocks outbound network") || !network.acceptedEvidence.includes("loopback only") || network.enforcementConfiguredInM300 || network.renderPermittedByThisTask) errors.push("render requires recorded local outbound-block/loopback-only evidence and remains disallowed in M3-00");
  if (run.conformance.status !== "not-run" || run.evaluation.status !== "not-evaluated" || run.evaluation.qualityRanking !== "not-made" || run.evaluation.representationDecision !== "not-made") errors.push("M3-00 must not present conformance, quality ranking, or representation decision as completed");
  if (!sameValues(run.m300ExecutionProhibitions, REQUIRED_PROHIBITIONS)) errors.push("M3-00 must retain every execution prohibition");
  return errors;
}
