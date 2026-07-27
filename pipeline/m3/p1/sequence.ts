/**
 * p1-i1: method-independent control track for the P1 comparison sequences.
 *
 * T0/T1/T3/T6/T7/T9 exist today only as the prose intent table in
 * `docs/character-architecture-strategy.md` §10. There is no shared frame
 * data, so every render method would invent its own timing and the P1
 * comparison would measure "who drew it" instead of "how the method
 * responds." This module is the single machine-readable source every method
 * (A/C/D/E core renders and the B2 quality-ceiling control) reads from.
 *
 * The control vocabulary below is defined independently of
 * `pipeline/m3/c/deform.ts`'s `CNativeControls`. It intentionally uses the
 * same field names and ranges -- C already had to solve "what does a
 * method-independent facial control look like" -- but it must not import
 * that type: a shared vocabulary that is subordinate to one method's
 * implementation stops being shared. `sequence.test.ts` asserts the two stay
 * in agreement without either module depending on the other.
 */

export const CONTROL_KEYS = [
  "jawOpen",
  "lipCornerPull",
  "lipCornerAsymmetry",
  "muzzleRound",
  "cheekPuff",
  "tongueRaise",
  "yawDegrees",
  "pitchDegrees",
  "breath",
  "blink",
] as const;

export type ControlKey = (typeof CONTROL_KEYS)[number];

/** Every P1 sequence control, at a single frame. */
export type P1SequenceControls = Record<ControlKey, number>;

/** Declared range per control. Adopted view range per ADR-001 / GOV-013. */
export const CONTROL_RANGE: Record<ControlKey, { min: number; max: number }> = {
  jawOpen: { min: 0, max: 1 },
  lipCornerPull: { min: -1, max: 1 },
  lipCornerAsymmetry: { min: -1, max: 1 },
  muzzleRound: { min: 0, max: 1 },
  cheekPuff: { min: 0, max: 1 },
  tongueRaise: { min: 0, max: 1 },
  yawDegrees: { min: -15, max: 15 },
  pitchDegrees: { min: -10, max: 10 },
  breath: { min: 0, max: 1 },
  blink: { min: 0, max: 1 },
};

/**
 * Anti-teleport bound: the largest a control may move between two adjacent
 * frames of the SAME sequence. Chosen generously above every production
 * sequence's actual peak step (see PR body for the per-sequence numbers) so
 * it only rejects an accidental discrete jump, not real motion. Continuity is
 * only required within one sequence; a hard cut between two different tests
 * (e.g. T3's last frame to T6's first frame) is expected and not a defect.
 */
export const CONTROL_MAX_STEP_PER_FRAME: Record<ControlKey, number> = {
  jawOpen: 0.15,
  lipCornerPull: 0.3,
  lipCornerAsymmetry: 0.3,
  muzzleRound: 0.15,
  cheekPuff: 0.15,
  tongueRaise: 0.15,
  yawDegrees: 1,
  pitchDegrees: 1,
  breath: 0.15,
  blink: 0.15,
};

export const REST_CONTROLS: P1SequenceControls = {
  jawOpen: 0,
  lipCornerPull: 0,
  lipCornerAsymmetry: 0,
  muzzleRound: 0,
  cheekPuff: 0,
  tongueRaise: 0,
  yawDegrees: 0,
  pitchDegrees: 0,
  breath: 0,
  blink: 0,
};

export const controls = (overrides: Partial<P1SequenceControls> = {}): P1SequenceControls => ({ ...REST_CONTROLS, ...overrides });

/** Declared, fixed interpolation vocabulary. `ease` is the monotonic smoothstep -- it never overshoots its two endpoints. */
export const INTERPOLATIONS = ["linear", "ease"] as const;
export type Interpolation = (typeof INTERPOLATIONS)[number];

export interface P1Keyframe {
  /** Absolute frame number on the shared 0..618 (provisional) timeline. */
  frame: number;
  controls: P1SequenceControls;
  /** Interpolation of the segment FROM this keyframe TO the next one. Ignored on the last keyframe of a sequence. */
  interpolation: Interpolation;
}

export const SEQUENCE_IDS = ["T0", "T1", "T3", "T6", "T7", "T9"] as const;
export type SequenceId = (typeof SEQUENCE_IDS)[number];

export interface P1Sequence {
  id: SequenceId;
  /** Short machine token for the performance intent, e.g. "neutral_hold". */
  intent: string;
  /** Plain-language: what defect or property this sequence is built to expose. */
  exposes: string;
  startFrame: number;
  /** Half-open, matches the P0b artifact contract convention. */
  endFrameExclusive: number;
  keyframes: P1Keyframe[];
}

export interface P1SequenceFile {
  schemaVersion: string;
  /** Marks the total frame count as provisional until p1-d0 decision (2) is made. */
  status: "PROVISIONAL_TOTAL_FRAME_COUNT" | "OWNER_DECIDED_TOTAL_FRAME_COUNT";
  provisionalNote: string;
  fps: number;
  startFrame: number;
  endFrameExclusive: number;
  /** The single, method-independent "still" comparison frame. Declared once here so no render method picks its own. */
  stillFrame: { frame: number; sequenceId: SequenceId };
  sequences: P1Sequence[];
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Smoothstep. Monotonic between t=0 and t=1: it never produces a value outside [a, b] (in either order). */
const smoothstep = (t: number): number => t * t * (3 - 2 * t);

const easedT = (t: number, method: Interpolation): number => (method === "ease" ? smoothstep(t) : t);

function interpolateControls(a: P1SequenceControls, b: P1SequenceControls, t: number, method: Interpolation): P1SequenceControls {
  const e = easedT(t, method);
  const result = {} as P1SequenceControls;
  for (const key of CONTROL_KEYS) result[key] = lerp(a[key], b[key], e);
  return result;
}

/**
 * Expands a sequence's keyframes into one control vector per frame, covering
 * every frame in `[startFrame, endFrameExclusive)` with no gaps. Pure and
 * deterministic: the same sequence always yields the same array.
 *
 * Assumes the keyframe-shape preconditions checked by `validateSequenceFile`
 * (sorted, first/last pinned to the sequence boundary, at least two
 * keyframes). Callers that skip validation get undefined behaviour on a
 * malformed sequence, not a silent wrong answer.
 */
export function expandSequence(sequence: P1Sequence): P1SequenceControls[] {
  const frames: P1SequenceControls[] = [];
  const kfs = sequence.keyframes;
  for (let f = sequence.startFrame; f < sequence.endFrameExclusive; f += 1) {
    let segment = kfs.length - 2;
    for (let i = 0; i < kfs.length - 1; i += 1) {
      if (f >= kfs[i].frame && f <= kfs[i + 1].frame) {
        segment = i;
        break;
      }
    }
    const from = kfs[segment];
    const to = kfs[segment + 1];
    const span = to.frame - from.frame;
    const t = span === 0 ? 0 : (f - from.frame) / span;
    frames.push(interpolateControls(from.controls, to.controls, t, from.interpolation));
  }
  return frames;
}

// ---------------------------------------------------------------------------
// Structural predicates (each backs one acceptance test / one negative fixture)
// ---------------------------------------------------------------------------

const EPS = 1e-9;

/** Every frame of every sequence stays within the declared control range. Endpoint-only checking is AP-013; this checks every expanded frame. */
export function isWithinRangeEveryFrame(file: P1SequenceFile): string[] {
  const errors: string[] = [];
  for (const sequence of file.sequences) {
    const frames = expandSequence(sequence);
    for (let f = 0; f < frames.length; f += 1) {
      for (const key of CONTROL_KEYS) {
        const { min, max } = CONTROL_RANGE[key];
        const value = frames[f][key];
        if (value < min - EPS || value > max + EPS) {
          errors.push(`${sequence.id} frame ${sequence.startFrame + f}: ${key}=${value} is outside [${min}, ${max}]`);
        }
      }
    }
  }
  return errors;
}

/** Bounded step between adjacent frames of the SAME sequence. Catches an accidental discrete jump. */
export function isStepBoundedEveryFrame(file: P1SequenceFile): string[] {
  const errors: string[] = [];
  for (const sequence of file.sequences) {
    const frames = expandSequence(sequence);
    for (let f = 1; f < frames.length; f += 1) {
      for (const key of CONTROL_KEYS) {
        const step = Math.abs(frames[f][key] - frames[f - 1][key]);
        const max = CONTROL_MAX_STEP_PER_FRAME[key];
        if (step > max + EPS) {
          errors.push(`${sequence.id} frame ${sequence.startFrame + f}: ${key} stepped ${step.toFixed(4)} in one frame, exceeding the ${max} bound`);
        }
      }
    }
  }
  return errors;
}

/**
 * T3 must contain a closure strictly inside the open span: a non-terminal
 * keyframe whose value drops to at or below `closedThreshold` while both its
 * neighbouring keyframes are at or above `openThreshold`. Requiring both
 * neighbours (not just the previous one) is what rejects a closure that
 * merely happens to be the last thing the mouth does before the sequence
 * ends -- that is closing AT the edge, not closing WHILE open.
 */
export function hasInteriorClosure(sequence: P1Sequence, key: ControlKey = "jawOpen", openThreshold = 0.5, closedThreshold = 0.15): boolean {
  const kfs = sequence.keyframes;
  for (let i = 1; i < kfs.length - 1; i += 1) {
    const before = kfs[i - 1].controls[key];
    const at = kfs[i].controls[key];
    const after = kfs[i + 1].controls[key];
    if (before >= openThreshold && after >= openThreshold && at <= closedThreshold) return true;
  }
  return false;
}

/**
 * T6 must move two axes simultaneously: at least one keyframe segment where
 * both `keys` have a nonzero delta. Moving them in separate, non-overlapping
 * segments (axis A fully, then axis B) is the sequential defect this rejects.
 */
export function hasSimultaneousMovement(sequence: P1Sequence, keys: readonly [ControlKey, ControlKey]): boolean {
  const kfs = sequence.keyframes;
  const [a, b] = keys;
  for (let i = 0; i < kfs.length - 1; i += 1) {
    const deltaA = kfs[i + 1].controls[a] - kfs[i].controls[a];
    const deltaB = kfs[i + 1].controls[b] - kfs[i].controls[b];
    if (Math.abs(deltaA) > EPS && Math.abs(deltaB) > EPS) return true;
  }
  return false;
}

/**
 * T9 must contain both a hold (>= 2 consecutive frames with no change) and a
 * direction reversal (the sign of the frame-to-frame delta flips at least
 * once, zero-delta hold frames excluded from the sign sequence).
 */
export function hasHoldAndReversal(sequence: P1Sequence, key: ControlKey = "jawOpen"): { hasHold: boolean; hasReversal: boolean } {
  const frames = expandSequence(sequence).map((c) => c[key]);
  let hasHold = false;
  const signs: number[] = [];
  for (let f = 1; f < frames.length; f += 1) {
    const delta = frames[f] - frames[f - 1];
    if (Math.abs(delta) <= EPS) {
      hasHold = true;
    } else {
      signs.push(Math.sign(delta));
    }
  }
  let hasReversal = false;
  for (let i = 1; i < signs.length; i += 1) {
    if (signs[i] !== signs[i - 1]) {
      hasReversal = true;
      break;
    }
  }
  return { hasHold, hasReversal };
}

/** Frame coverage: sequences sorted by start must exactly tile [file.startFrame, file.endFrameExclusive) -- no gap, no overlap. */
export function isFrameCoverageComplete(file: P1SequenceFile): string[] {
  const errors: string[] = [];
  const sorted = [...file.sequences].sort((x, y) => x.startFrame - y.startFrame);
  let cursor = file.startFrame;
  for (const sequence of sorted) {
    if (sequence.startFrame !== cursor) {
      errors.push(`${sequence.id} starts at ${sequence.startFrame} but frame ${cursor} is the first uncovered frame; coverage has a gap or overlap`);
    }
    cursor = sequence.endFrameExclusive;
  }
  if (cursor !== file.endFrameExclusive) {
    errors.push(`sequences cover up to frame ${cursor} but the declared total is ${file.endFrameExclusive}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Full structural validation
// ---------------------------------------------------------------------------

function isPlainRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min - EPS && value <= max + EPS;
}

function validateKeyframeShape(sequence: P1Sequence): string[] {
  const errors: string[] = [];
  const kfs = sequence.keyframes;
  if (kfs.length < 2) {
    errors.push(`${sequence.id} needs at least two keyframes`);
    return errors;
  }
  if (kfs[0].frame !== sequence.startFrame) errors.push(`${sequence.id} first keyframe must be at startFrame ${sequence.startFrame}`);
  if (kfs[kfs.length - 1].frame !== sequence.endFrameExclusive - 1) errors.push(`${sequence.id} last keyframe must be at the last frame ${sequence.endFrameExclusive - 1}`);
  for (let i = 0; i < kfs.length; i += 1) {
    const kf = kfs[i];
    if (!Number.isInteger(kf.frame) || kf.frame < sequence.startFrame || kf.frame >= sequence.endFrameExclusive) {
      errors.push(`${sequence.id} keyframe ${i} has an out-of-range frame ${kf.frame}`);
    }
    if (i > 0 && kf.frame <= kfs[i - 1].frame) errors.push(`${sequence.id} keyframes must have strictly increasing frame numbers`);
    if (!INTERPOLATIONS.includes(kf.interpolation)) errors.push(`${sequence.id} keyframe ${i} has an undeclared interpolation "${kf.interpolation}"`);
    for (const key of CONTROL_KEYS) {
      const { min, max } = CONTROL_RANGE[key];
      if (!isPlainRange(kf.controls[key], min, max)) errors.push(`${sequence.id} keyframe ${i}: ${key}=${kf.controls[key]} is outside [${min}, ${max}]`);
    }
  }
  return errors;
}

/**
 * Full structural validation of the P1 sequence file. Returns every
 * violation; makes no quality, ranking, or representation decision.
 */
export function validateSequenceFile(file: P1SequenceFile): string[] {
  const errors: string[] = [];

  if (file.schemaVersion !== "m3-p1-sequence-v1") errors.push("schemaVersion must be m3-p1-sequence-v1");
  if (file.status !== "PROVISIONAL_TOTAL_FRAME_COUNT" && file.status !== "OWNER_DECIDED_TOTAL_FRAME_COUNT") errors.push("status must declare whether the total frame count is provisional");
  if (file.fps <= 0) errors.push("fps must be positive");
  if (file.startFrame !== 0) errors.push("startFrame must be 0");
  if (file.endFrameExclusive <= file.startFrame) errors.push("endFrameExclusive must be greater than startFrame");

  const ids = file.sequences.map((s) => s.id);
  const idSet = new Set(ids);
  if (ids.length !== SEQUENCE_IDS.length || !SEQUENCE_IDS.every((id) => idSet.has(id))) {
    errors.push(`sequence set must be exactly ${SEQUENCE_IDS.join("/")}`);
  }

  const still = file.stillFrame;
  const stillSequence = file.sequences.find((s) => s.id === still.sequenceId);
  if (!stillSequence || still.frame < stillSequence.startFrame || still.frame >= stillSequence.endFrameExclusive) {
    errors.push("stillFrame must fall inside its declared sequence's frame range");
  }

  for (const sequence of file.sequences) {
    errors.push(...validateKeyframeShape(sequence));
  }

  // Only continue to the semantic (interpolation-dependent) checks once every
  // sequence's keyframe shape is sound; expandSequence assumes that shape.
  if (errors.length === 0) {
    errors.push(...isWithinRangeEveryFrame(file));
    errors.push(...isStepBoundedEveryFrame(file));
    errors.push(...isFrameCoverageComplete(file));

    const t3 = file.sequences.find((s) => s.id === "T3");
    if (t3 && !hasInteriorClosure(t3)) errors.push("T3 must contain a closure strictly inside the open span, not at its edge");

    const t6 = file.sequences.find((s) => s.id === "T6");
    if (t6 && !hasSimultaneousMovement(t6, ["jawOpen", "lipCornerPull"])) errors.push("T6 must move two axes simultaneously, not sequentially");

    const t9 = file.sequences.find((s) => s.id === "T9");
    if (t9) {
      const { hasHold, hasReversal } = hasHoldAndReversal(t9);
      if (!hasHold) errors.push("T9 must contain a hold (no motion for at least two consecutive frames)");
      if (!hasReversal) errors.push("T9 must contain a direction reversal");
    }
  }

  return errors;
}
