/**
 * M3-10: Base B1 state-count and transition-boundary artifact.
 *
 * B1 is a whole-head discrete lookup: every distinct appearance is a separate
 * completed head. It answers two questions the other bases cannot answer for it:
 * how many states the observable set actually demands, and what happens between
 * two neighbouring states.
 *
 * B1 is kept out of the central A/C/D/E quality ranking for P1. It is NOT
 * declared ineligible: `docs/character-architecture-strategy.md` withdrew the
 * first-draft exclusion, so finalist eligibility stays OPEN pending measured
 * state count and incremental cost. This artifact supplies the count; it does
 * not decide the eligibility.
 *
 * PROPOSED, PoC-scoped.
 */

export const B1_STATUS = "PROPOSED" as const;

export interface B1MechanismDeclaration {
  id: string;
  mechanismClass: string;
  role: string;
  /** P1 keeps B1 out of the central ranking; see the M3-10 stop condition. */
  centralQualityRankingMember: boolean;
  /** Deliberately OPEN. Neither this artifact nor any agent may close it. */
  finalistEligibility: "OPEN" | "RETAINED" | "DROPPED";
  decidedBy: string;
}

export const B1_MECHANISM: B1MechanismDeclaration = {
  id: "B1",
  mechanismClass: "whole-head-discrete-lookup",
  role: "state-transition-boundary",
  centralQualityRankingMember: false,
  finalistEligibility: "OPEN",
  decidedBy: "mi3san at M3-13; measured state count and incremental cost are inputs, not the decision",
};

/**
 * One controllable axis of appearance.
 *
 * `assumedStepLimit` is the largest quantisation step assumed to pass unnoticed.
 * It is an ASSUMPTION, not a measurement: nobody has yet looked at real frames
 * to find where a step becomes visible. Per AP-007 it must not be reported as an
 * observation, so every state count below is published as a function of it
 * rather than as a single number.
 */
export interface Axis {
  id: string;
  unit: string;
  range: number;
  assumedStepLimit: { coarse: number; medium: number; fine: number };
  /** Whether the axis multiplies the whole head set or only a sub-region. */
  multipliesWholeHead: boolean;
}

export const AXES: Axis[] = [
  { id: "jawOpen", unit: "normalised", range: 1, assumedStepLimit: { coarse: 0.25, medium: 0.125, fine: 0.0625 }, multipliesWholeHead: true },
  { id: "lipCornerPull", unit: "normalised", range: 2, assumedStepLimit: { coarse: 0.5, medium: 0.25, fine: 0.125 }, multipliesWholeHead: true },
  { id: "lipCornerAsymmetry", unit: "normalised", range: 2, assumedStepLimit: { coarse: 1, medium: 0.5, fine: 0.25 }, multipliesWholeHead: true },
  { id: "muzzleRound", unit: "normalised", range: 1, assumedStepLimit: { coarse: 0.5, medium: 0.25, fine: 0.125 }, multipliesWholeHead: true },
  { id: "cheekPuff", unit: "normalised", range: 1, assumedStepLimit: { coarse: 1, medium: 0.5, fine: 0.25 }, multipliesWholeHead: true },
  { id: "tongueRaise", unit: "normalised", range: 1, assumedStepLimit: { coarse: 1, medium: 0.5, fine: 0.25 }, multipliesWholeHead: true },
  { id: "yaw", unit: "degrees", range: 30, assumedStepLimit: { coarse: 15, medium: 7.5, fine: 3.75 }, multipliesWholeHead: true },
  { id: "pitch", unit: "degrees", range: 20, assumedStepLimit: { coarse: 10, medium: 5, fine: 2.5 }, multipliesWholeHead: true },
  { id: "blink", unit: "normalised", range: 1, assumedStepLimit: { coarse: 1, medium: 0.5, fine: 0.25 }, multipliesWholeHead: true },
];

export type Granularity = "coarse" | "medium" | "fine";
export const GRANULARITIES: Granularity[] = ["coarse", "medium", "fine"];

/** Levels an axis needs at a granularity: endpoints plus enough steps between. */
export const levelsFor = (axis: Axis, granularity: Granularity): number =>
  Math.ceil(axis.range / axis.assumedStepLimit[granularity]) + 1;

/**
 * B1 stores whole heads, so nothing factorises: the set is the product across
 * every axis. This is the number the strategy asked to be measured rather than
 * argued about.
 */
export const stateCount = (granularity: Granularity, axes: readonly Axis[] = AXES): number =>
  axes.reduce((product, axis) => product * levelsFor(axis, granularity), 1);

/**
 * The A comparison. A factorises into a mouth patch set times a pose set, which
 * is why it is cheap and also why its seams exist. The contrast is the point of
 * this card, so it is computed rather than asserted.
 */
export const factorisedCount = (granularity: Granularity, axes: readonly Axis[] = AXES): number =>
  axes.reduce((sum, axis) => sum + levelsFor(axis, granularity), 0);

export type Capability = "supported" | "approximated" | "unsupported";

export interface ObservableCapability {
  observable: string;
  sequence: string;
  capability: Capability;
  reason: string;
}

/**
 * What a whole-head lookup can and cannot do, per P1 observable.
 *
 * "supported" means B1 can hold the appearance exactly at an authored state.
 * "approximated" means it lands on the nearest state and carries that error.
 * "unsupported" means no number of states removes the limitation.
 */
export const CAPABILITIES: ObservableCapability[] = [
  { observable: "identity at rest", sequence: "T0", capability: "supported", reason: "A single authored head holds exactly; there is no seam because nothing is composited." },
  { observable: "jaw and lip corner travel", sequence: "T1", capability: "approximated", reason: "The ramp lands on the nearest authored level; the residual is the assumed step limit, which is unvalidated." },
  { observable: "closure during open, contact and occlusion", sequence: "T3", capability: "supported", reason: "Occlusion is whatever the artist drew in that state; no runtime masking is involved." },
  { observable: "two-axis combination", sequence: "T6", capability: "approximated", reason: "Every combination is representable, but only by authoring the full cross product; the cost is the state count, not a quality limit." },
  { observable: "view dependence within yaw +/-15 and pitch +/-10", sequence: "T7", capability: "approximated", reason: "Each view is a further multiplier on the entire set." },
  { observable: "temporal continuity, overshoot, flicker", sequence: "T9", capability: "unsupported", reason: "No state exists between two authored states. Speed change, hold and direction reversal are expressed by choosing among existing states, so the in-between motion cannot be shaped at all. Adding states shortens each step but never removes the stepping." },
];

/**
 * The transition boundary: what actually happens between two neighbouring
 * states. This is the property the card exists to record.
 */
export const transitionBoundary = (granularity: Granularity) => ({
  granularity,
  intermediateStatesAvailable: 0,
  largestUnavoidableStep: Object.fromEntries(AXES.map((axis) => [axis.id, axis.assumedStepLimit[granularity]])),
  note: "Between any two authored states the appearance changes in one frame by the full step. The step shrinks with granularity and never reaches zero.",
});
