import { describe, expect, it } from "vitest";
import type { CNativeControls } from "../c/deform";
import sequenceFileJson from "./p1-sequences.json";
import {
  CONTROL_KEYS,
  REST_CONTROLS,
  SEQUENCE_IDS,
  expandSequence,
  hasHoldAndReversal,
  hasInteriorClosure,
  hasSimultaneousMovement,
  isFrameCoverageComplete,
  isStepBoundedEveryFrame,
  isWithinRangeEveryFrame,
  validateSequenceFile,
  type ControlKey,
  type P1Sequence,
  type P1SequenceFile,
} from "./sequence";

const FILE = sequenceFileJson as P1SequenceFile;
const byId = (id: (typeof SEQUENCE_IDS)[number]): P1Sequence => {
  const found = FILE.sequences.find((s) => s.id === id);
  if (!found) throw new Error(`fixture is missing sequence ${id}`);
  return found;
};

describe("p1-i1 control vocabulary is independent of, but consistent with, C's CNativeControls", () => {
  it("declares the exact same field set as pipeline/m3/c/deform.ts, without importing its type", () => {
    // This line only exists to force a compile error if the two vocabularies
    // ever diverge; sequence.ts itself never imports from deform.ts.
    const cross: Record<ControlKey, keyof CNativeControls> = {
      jawOpen: "jawOpen",
      lipCornerPull: "lipCornerPull",
      lipCornerAsymmetry: "lipCornerAsymmetry",
      muzzleRound: "muzzleRound",
      cheekPuff: "cheekPuff",
      tongueRaise: "tongueRaise",
      yawDegrees: "yawDegrees",
      pitchDegrees: "pitchDegrees",
      breath: "breath",
      blink: "blink",
    };
    expect(Object.keys(cross).sort()).toEqual(Object.keys(REST_CONTROLS).sort());
    expect(CONTROL_KEYS.length).toBe(10);
  });
});

describe("p1-i1 sequence file: structural acceptance", () => {
  it("is structurally valid end to end", () => {
    expect(validateSequenceFile(FILE)).toEqual([]);
  });

  it("declares the total frame count as provisional, per p1-d0 decision (2) being unmade", () => {
    expect(FILE.status).toBe("PROVISIONAL_TOTAL_FRAME_COUNT");
    expect(FILE.endFrameExclusive - FILE.startFrame).toBe(619);
  });

  it("fixes the exact six-sequence set the run definition requires", () => {
    expect(FILE.sequences.map((s) => s.id).sort()).toEqual([...SEQUENCE_IDS].sort());
  });

  it("keeps yaw and pitch within +/-15 / +/-10 at EVERY frame, not just at sequence endpoints", () => {
    expect(isWithinRangeEveryFrame(FILE)).toEqual([]);
    // Explicitly re-check the endpoint-only blind spot AP-013 exploited: confirm
    // every single interior frame of T7 (not just its first/last) is in range.
    const t7 = byId("T7");
    const frames = expandSequence(t7);
    expect(frames.length).toBe(t7.endFrameExclusive - t7.startFrame);
    for (const frame of frames) {
      expect(Math.abs(frame.yawDegrees)).toBeLessThanOrEqual(15);
      expect(Math.abs(frame.pitchDegrees)).toBeLessThanOrEqual(10);
    }
  });

  it("T3 contains a closure strictly inside the open span", () => {
    expect(hasInteriorClosure(byId("T3"))).toBe(true);
  });

  it("T6 moves two axes simultaneously, not sequentially", () => {
    expect(hasSimultaneousMovement(byId("T6"), ["jawOpen", "lipCornerPull"])).toBe(true);
  });

  it("T9 contains both a hold and a direction reversal", () => {
    const { hasHold, hasReversal } = hasHoldAndReversal(byId("T9"));
    expect(hasHold).toBe(true);
    expect(hasReversal).toBe(true);
  });

  it("has complete frame coverage with no gaps across the whole 619-frame track", () => {
    expect(isFrameCoverageComplete(FILE)).toEqual([]);
  });

  it("interpolates continuously: no per-frame step exceeds the declared bound", () => {
    expect(isStepBoundedEveryFrame(FILE)).toEqual([]);
  });

  it("is deterministic: expanding the same sequence twice yields identical frames", () => {
    for (const sequence of FILE.sequences) {
      expect(expandSequence(sequence)).toEqual(expandSequence(sequence));
    }
    expect(validateSequenceFile(structuredClone(FILE))).toEqual(validateSequenceFile(FILE));
  });

  it("declares the single method-independent still frame inside its sequence's range", () => {
    const stillSequence = byId(FILE.stillFrame.sequenceId);
    expect(FILE.stillFrame.frame).toBeGreaterThanOrEqual(stillSequence.startFrame);
    expect(FILE.stillFrame.frame).toBeLessThan(stillSequence.endFrameExclusive);
  });
});

describe("p1-i1 sequence file: negative fixtures (every one of these MUST fail validation)", () => {
  it("rejects a yaw excursion that occurs only on an interior frame, endpoints in range", () => {
    // This is exactly the AP-013 shape: the sequence's first and last frames
    // are in range, but a middle keyframe alone is not. An endpoint-only
    // checker would pass this; validateSequenceFile must not.
    const invalid = structuredClone(FILE);
    const t7 = invalid.sequences.find((s) => s.id === "T7")!;
    t7.keyframes.splice(1, 0, {
      frame: 400,
      interpolation: "linear",
      controls: { ...REST_CONTROLS, yawDegrees: 16, jawOpen: 0.5 },
    });
    const errors = validateSequenceFile(invalid);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("outside") && e.includes("yawDegrees"))).toBe(true);
  });

  it("rejects a T3 closure placed at the edge of the span instead of strictly inside it", () => {
    const invalid = structuredClone(FILE);
    const t3 = invalid.sequences.find((s) => s.id === "T3")!;
    // Drop the reopening keyframe so the sequence ends AT the closure -- an
    // edge closure, not a closure surrounded by open frames.
    t3.keyframes = t3.keyframes.slice(0, 3);
    t3.keyframes[2].frame = t3.endFrameExclusive - 1;
    expect(validateSequenceFile(invalid)).toContain("T3 must contain a closure strictly inside the open span, not at its edge");
  });

  it("rejects T9 with a hold but no direction reversal", () => {
    const invalid = structuredClone(FILE);
    const t9 = invalid.sequences.find((s) => s.id === "T9")!;
    // Monotonic non-decreasing throughout, still with a held plateau.
    t9.keyframes = [
      { frame: 495, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 0 } },
      { frame: 515, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 0.5 } },
      { frame: 545, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 0.5 } },
      { frame: 618, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 1 } },
    ];
    expect(validateSequenceFile(invalid)).toContain("T9 must contain a direction reversal");
  });

  it("rejects T9 with a direction reversal but no hold", () => {
    const invalid = structuredClone(FILE);
    const t9 = invalid.sequences.find((s) => s.id === "T9")!;
    // Continuously changing throughout -- rises then falls, but never flat.
    t9.keyframes = [
      { frame: 495, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 0 } },
      { frame: 555, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 0.9 } },
      { frame: 618, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 0.1 } },
    ];
    expect(validateSequenceFile(invalid)).toContain("T9 must contain a hold (no motion for at least two consecutive frames)");
  });

  it("rejects T6 moving its two axes sequentially instead of simultaneously", () => {
    const invalid = structuredClone(FILE);
    const t6 = invalid.sequences.find((s) => s.id === "T6")!;
    t6.keyframes = [
      { frame: 255, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 0, lipCornerPull: -1 } },
      { frame: 314, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 1, lipCornerPull: -1 } },
      { frame: 374, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 1, lipCornerPull: 1 } },
    ];
    expect(validateSequenceFile(invalid)).toContain("T6 must move two axes simultaneously, not sequentially");
  });

  it("rejects a gap left in frame coverage", () => {
    const invalid = structuredClone(FILE);
    const t3 = invalid.sequences.find((s) => s.id === "T3")!;
    // Shrink T3 by five frames without extending its neighbour: frames 250..254 are now uncovered.
    t3.endFrameExclusive = 250;
    t3.keyframes[t3.keyframes.length - 1].frame = 249;
    const errors = validateSequenceFile(invalid);
    expect(errors.some((e) => e.includes("coverage has a gap or overlap") || e.includes("but the declared total is"))).toBe(true);
  });

  it("rejects a control value outside its declared range at a keyframe", () => {
    const invalid = structuredClone(FILE);
    const t0 = invalid.sequences.find((s) => s.id === "T0")!;
    t0.keyframes[0].controls.jawOpen = 1.4;
    expect(validateSequenceFile(invalid).some((e) => e.includes("jawOpen=1.4"))).toBe(true);
  });

  it("rejects a discrete one-frame teleport that violates the continuity bound", () => {
    const invalid = structuredClone(FILE);
    const t1 = invalid.sequences.find((s) => s.id === "T1")!;
    // Force the ramp to complete in the single frame after the first keyframe.
    t1.keyframes = [
      { frame: 60, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 0 } },
      { frame: 61, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 1 } },
      { frame: 149, interpolation: "linear", controls: { ...REST_CONTROLS, jawOpen: 1 } },
    ];
    expect(isStepBoundedEveryFrame(invalid).length).toBeGreaterThan(0);
  });
});
