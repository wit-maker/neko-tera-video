import { AXES, B1_MECHANISM, B1_STATUS, CAPABILITIES, GRANULARITIES, factorisedCount, levelsFor, stateCount, transitionBoundary, type B1MechanismDeclaration, type ObservableCapability } from "./states";

/**
 * M3-10 acceptance check. It confirms every P1 observable carries a
 * supported / approximated / unsupported verdict with a reason, that the state
 * count is published as a function of its assumption rather than as a single
 * measured-looking number, and that B1 is neither mixed into the central
 * quality ranking nor quietly retained or dropped by an agent.
 */
export function validateB1Artifact(
  mechanism: B1MechanismDeclaration = B1_MECHANISM,
  capabilities: readonly ObservableCapability[] = CAPABILITIES,
): string[] {
  const errors: string[] = [];

  if (B1_STATUS !== "PROPOSED") errors.push("B1 must remain a PROPOSED PoC artifact");
  if (mechanism.role !== "state-transition-boundary") errors.push("B1 must stay the state-transition-boundary artifact in P1");
  // The M3-10 stop condition.
  if (mechanism.centralQualityRankingMember) errors.push("B1 must not be mixed into the central A/C/D/E quality ranking");
  // The opposite failure: the strategy withdrew the first-draft exclusion, so
  // no agent may close eligibility either way. Only mi3san closes it at M3-13.
  if (mechanism.finalistEligibility !== "OPEN") errors.push("B1 finalist eligibility must stay OPEN until mi3san decides it at M3-13");
  if (!mechanism.decidedBy.includes("mi3san")) errors.push("B1 must record that mi3san owns the eligibility decision");

  const observables = new Set(capabilities.map((entry) => entry.observable));
  if (observables.size !== capabilities.length) errors.push("each observable must carry exactly one verdict");
  for (const entry of capabilities) {
    if (!["supported", "approximated", "unsupported"].includes(entry.capability)) errors.push(`${entry.observable} has an invalid capability verdict`);
    if (!entry.reason) errors.push(`${entry.observable} must record why it received that verdict`);
    if (!entry.sequence) errors.push(`${entry.observable} must name the sequence it belongs to`);
  }
  // The card exists to expose a boundary; a set with no unsupported entry would
  // mean the boundary was never reached and nothing was learned.
  if (!capabilities.some((entry) => entry.capability === "unsupported")) errors.push("B1 must record at least one unsupported observable, or the transition boundary is unmeasured");

  for (const axis of AXES) {
    if (axis.range <= 0) errors.push(`axis ${axis.id} needs a positive range`);
    const limits = GRANULARITIES.map((granularity) => axis.assumedStepLimit[granularity]);
    if (limits.some((limit) => limit <= 0)) errors.push(`axis ${axis.id} needs positive assumed step limits`);
    if (limits.some((limit, index) => index > 0 && limit >= limits[index - 1])) errors.push(`axis ${axis.id} step limits must tighten from coarse to fine`);
  }

  // Published as a function of the assumption, at every granularity, so nobody
  // can quote a single number as if it were measured.
  for (const granularity of GRANULARITIES) {
    if (!Number.isFinite(stateCount(granularity)) || stateCount(granularity) <= 0) errors.push(`state count at ${granularity} is not a usable number`);
    if (transitionBoundary(granularity).intermediateStatesAvailable !== 0) errors.push("a whole-head lookup has no intermediate state by definition");
  }
  if (!(stateCount("coarse") < stateCount("medium") && stateCount("medium") < stateCount("fine"))) errors.push("state count must grow as the assumed step limit tightens");

  return errors;
}

/** The measured figures, for the M3-12 capability matrix. */
export const B1_STATE_RECORD = {
  task: "M3-10",
  mechanism: B1_MECHANISM,
  assumptionWarning: "assumedStepLimit is an ASSUMPTION. No frames have been examined to find where a quantisation step becomes visible. Every count below is conditional on it and none of them is an observation.",
  perGranularity: GRANULARITIES.map((granularity) => ({
    granularity,
    levelsPerAxis: Object.fromEntries(AXES.map((axis) => [axis.id, levelsFor(axis, granularity)])),
    wholeHeadStates: stateCount(granularity),
    factorisedComparison: factorisedCount(granularity),
    explosionRatio: Math.round(stateCount(granularity) / factorisedCount(granularity)),
    transitionBoundary: transitionBoundary(granularity),
  })),
  capabilities: CAPABILITIES,
  notMeasuredHere: [
    "Where a quantisation step actually becomes visible. That needs real frames and mi3san's eyes; until then every state count is conditional.",
    "The per-state authoring cost. The count is a multiplier on whatever that cost turns out to be, and it has not been measured.",
    "Whether B1 stays a finalist. That is M3-13 and belongs to mi3san.",
  ],
} as const;
