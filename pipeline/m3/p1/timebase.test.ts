import { describe, expect, it } from "vitest";
import {
  containsGlobalFrame,
  containsLocalFrame,
  globalFrameCount,
  localFrameCount,
  toGlobalRange,
  toLocalRange,
  type GlobalFrameRange,
  type LocalFrameRange,
} from "./timebase";

// A tiny deterministic PRNG (no new dependency) so the round-trip property
// test below is reproducible instead of relying on Math.random().
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("toLocalRange: the literal case from the p1-i2 packet", () => {
  it("converts the inclusive global baseline range 17617..18235 to {startFrame: 0, endFrameExclusive: 619}", () => {
    const global: GlobalFrameRange = { clipStart: 17617, clipEnd: 18235 };
    expect(toLocalRange(global)).toEqual({ startFrame: 0, endFrameExclusive: 619 });
  });

  it("agrees with the P0 baseline's own recorded frameCount (619)", () => {
    const global: GlobalFrameRange = { clipStart: 17617, clipEnd: 18235 };
    expect(globalFrameCount(global)).toBe(619);
    expect(localFrameCount(toLocalRange(global))).toBe(619);
  });
});

describe("endFrameExclusive does not include the final frame", () => {
  it("excludes frame 619 and includes frame 618 for the baseline range", () => {
    const local: LocalFrameRange = { startFrame: 0, endFrameExclusive: 619 };
    expect(containsLocalFrame(local, 618)).toBe(true);
    expect(containsLocalFrame(local, 619)).toBe(false);
    expect(local.endFrameExclusive).not.toBe(618); // the boundary is the count, not the last valid index
  });

  it("the corresponding global range includes clipEnd but not clipEnd + 1", () => {
    const global: GlobalFrameRange = { clipStart: 17617, clipEnd: 18235 };
    expect(containsGlobalFrame(global, 18235)).toBe(true);
    expect(containsGlobalFrame(global, 18236)).toBe(false);
  });
});

describe("round trip: local -> global -> local is the identity", () => {
  it("holds for the literal baseline case", () => {
    const anchor = 17617;
    const local: LocalFrameRange = { startFrame: 0, endFrameExclusive: 619 };
    expect(toLocalRange(toGlobalRange(local, anchor), anchor)).toEqual(local);
  });

  it("holds for a table of hand-picked ranges and anchors", () => {
    const cases: Array<{ local: LocalFrameRange; anchor: number }> = [
      { local: { startFrame: 0, endFrameExclusive: 1 }, anchor: 0 },
      { local: { startFrame: 5, endFrameExclusive: 10 }, anchor: 100 },
      { local: { startFrame: 0, endFrameExclusive: 619 }, anchor: 17617 },
      { local: { startFrame: 309, endFrameExclusive: 618 }, anchor: 42 },
      { local: { startFrame: 0, endFrameExclusive: 1_000_000 }, anchor: -50 },
    ];
    for (const { local, anchor } of cases) {
      expect(toLocalRange(toGlobalRange(local, anchor), anchor)).toEqual(local);
    }
  });

  it("holds for a property-test-style sweep of pseudo-random ranges", () => {
    const random = mulberry32(20260727);
    for (let i = 0; i < 200; i++) {
      const anchor = Math.floor(random() * 200_000) - 100_000;
      const startFrame = Math.floor(random() * 10_000);
      const length = 1 + Math.floor(random() * 10_000);
      const local: LocalFrameRange = { startFrame, endFrameExclusive: startFrame + length };
      expect(toLocalRange(toGlobalRange(local, anchor), anchor)).toEqual(local);
    }
  });
});

describe("round trip: global -> local -> global is the identity", () => {
  it("holds for a property-test-style sweep of pseudo-random ranges", () => {
    const random = mulberry32(619);
    for (let i = 0; i < 200; i++) {
      const clipStart = Math.floor(random() * 200_000) - 100_000;
      const length = 1 + Math.floor(random() * 10_000);
      const global: GlobalFrameRange = { clipStart, clipEnd: clipStart + length - 1 };
      const anchor = global.clipStart;
      expect(toGlobalRange(toLocalRange(global, anchor), anchor)).toEqual(global);
    }
  });
});

describe("negative tests: these must all throw", () => {
  it("rejects an inverted global range (clipEnd < clipStart)", () => {
    expect(() => toLocalRange({ clipStart: 100, clipEnd: 99 })).toThrow(/inverted/);
    expect(() => globalFrameCount({ clipStart: 100, clipEnd: 99 })).toThrow(/inverted/);
  });

  it("rejects a global range that is otherwise well-formed but still inverted at the boundary", () => {
    // clipStart === clipEnd + 1 is the smallest possible inversion.
    expect(() => toLocalRange({ clipStart: 1, clipEnd: 0 })).toThrow(/inverted/);
  });

  it("rejects a local range whose frame count is zero", () => {
    expect(() => localFrameCount({ startFrame: 5, endFrameExclusive: 5 })).toThrow(/zero or negative/);
    expect(() => toGlobalRange({ startFrame: 5, endFrameExclusive: 5 }, 0)).toThrow(/zero or negative/);
  });

  it("rejects a local range whose frame count is negative", () => {
    expect(() => localFrameCount({ startFrame: 10, endFrameExclusive: 5 })).toThrow(/zero or negative/);
    expect(() => toGlobalRange({ startFrame: 10, endFrameExclusive: 5 }, 0)).toThrow(/zero or negative/);
  });

  it("rejects non-integer frame indices", () => {
    expect(() => toLocalRange({ clipStart: 0.5, clipEnd: 10 })).toThrow(/integer/);
    expect(() => toGlobalRange({ startFrame: 0, endFrameExclusive: 10.5 }, 0)).toThrow(/integer/);
  });
});

describe("negative test: inclusive/half-open are not structurally interchangeable", () => {
  it("a GlobalFrameRange cannot be passed where a LocalFrameRange is required, and vice versa (compile-time)", () => {
    const global: GlobalFrameRange = { clipStart: 17617, clipEnd: 18235 };
    const local: LocalFrameRange = { startFrame: 0, endFrameExclusive: 619 };

    // @ts-expect-error clipStart/clipEnd is not startFrame/endFrameExclusive: this must fail to typecheck.
    const wrongWayRound: LocalFrameRange = global;
    // @ts-expect-error startFrame/endFrameExclusive is not clipStart/clipEnd: this must fail to typecheck.
    const otherWrongWayRound: GlobalFrameRange = local;

    // Keep the intentionally-mistyped values referenced so this remains a
    // real (if unreachable) assignment for tsc to check, not dead code the
    // compiler could elide before ever reaching the @ts-expect-error lines.
    expect(wrongWayRound).toBeDefined();
    expect(otherWrongWayRound).toBeDefined();
  });
});
