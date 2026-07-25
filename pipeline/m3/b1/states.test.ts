import { describe, expect, it } from "vitest";
import { AXES, B1_MECHANISM, CAPABILITIES, factorisedCount, levelsFor, stateCount, transitionBoundary } from "./states";
import { B1_STATE_RECORD, validateB1Artifact } from "./conformance";

describe("M3-10 B1 keeps its place and its open question", () => {
  it("stays out of the central quality ranking", () => {
    expect(B1_MECHANISM.centralQualityRankingMember).toBe(false);
    expect(B1_MECHANISM.role).toBe("state-transition-boundary");
    expect(validateB1Artifact()).toEqual([]);
  });

  it("rejects being mixed into the central ranking", () => {
    expect(validateB1Artifact({ ...B1_MECHANISM, centralQualityRankingMember: true }))
      .toContain("B1 must not be mixed into the central A/C/D/E quality ranking");
  });

  it("rejects an agent closing finalist eligibility in either direction", () => {
    // The first-draft exclusion was withdrawn, so dropping is as wrong as retaining.
    for (const eligibility of ["RETAINED", "DROPPED"] as const) {
      expect(validateB1Artifact({ ...B1_MECHANISM, finalistEligibility: eligibility }))
        .toContain("B1 finalist eligibility must stay OPEN until mi3san decides it at M3-13");
    }
  });
});

describe("M3-10 state count is conditional on a stated assumption", () => {
  it("labels the step limit as an assumption rather than a measurement", () => {
    expect(B1_STATE_RECORD.assumptionWarning).toMatch(/ASSUMPTION/);
    expect(B1_STATE_RECORD.assumptionWarning).toMatch(/none of them is an observation/);
    expect(B1_STATE_RECORD.notMeasuredHere.join(" ")).toMatch(/mi3san/);
  });

  it("publishes a count at every granularity, never one bare number", () => {
    expect(B1_STATE_RECORD.perGranularity).toHaveLength(3);
    for (const entry of B1_STATE_RECORD.perGranularity) {
      expect(entry.wholeHeadStates).toBeGreaterThan(0);
      expect(Object.keys(entry.levelsPerAxis)).toHaveLength(AXES.length);
    }
  });

  it("grows the set as the assumed step tightens", () => {
    expect(stateCount("coarse")).toBeLessThan(stateCount("medium"));
    expect(stateCount("medium")).toBeLessThan(stateCount("fine"));
  });

  it("shows the whole-head set exploding against a factorised one", () => {
    // B1 stores complete heads, so nothing factorises: the set is a product
    // where A's is a sum. That gap is the cost this card exists to measure.
    for (const granularity of ["coarse", "medium", "fine"] as const) {
      expect(stateCount(granularity)).toBeGreaterThan(factorisedCount(granularity) * 100);
    }
    expect(levelsFor(AXES[0], "fine")).toBeGreaterThan(levelsFor(AXES[0], "coarse"));
  });
});

describe("M3-10 transition boundary", () => {
  it("has no intermediate state at any granularity", () => {
    for (const granularity of ["coarse", "medium", "fine"] as const) {
      expect(transitionBoundary(granularity).intermediateStatesAvailable).toBe(0);
    }
  });

  it("shrinks the unavoidable step without ever reaching zero", () => {
    const coarse = transitionBoundary("coarse").largestUnavoidableStep;
    const fine = transitionBoundary("fine").largestUnavoidableStep;
    for (const axis of AXES) {
      expect(fine[axis.id]).toBeLessThan(coarse[axis.id]);
      expect(fine[axis.id]).toBeGreaterThan(0);
    }
  });

  it("classifies every observable and reaches an unsupported one", () => {
    for (const entry of CAPABILITIES) {
      expect(["supported", "approximated", "unsupported"]).toContain(entry.capability);
      expect(entry.reason.length).toBeGreaterThan(0);
    }
    const unsupported = CAPABILITIES.filter((entry) => entry.capability === "unsupported");
    expect(unsupported).toHaveLength(1);
    expect(unsupported[0].sequence).toBe("T9");
    expect(unsupported[0].reason).toMatch(/never removes the stepping/);
  });

  it("rejects a capability set with no boundary in it", () => {
    // A set where everything is supported would mean nothing was learned.
    const softened = CAPABILITIES.map((entry) => ({ ...entry, capability: "supported" as const }));
    expect(validateB1Artifact(B1_MECHANISM, softened))
      .toContain("B1 must record at least one unsupported observable, or the transition boundary is unmeasured");
  });

  it("rejects a verdict recorded without a reason", () => {
    const unexplained = CAPABILITIES.map((entry) => (entry.sequence === "T9" ? { ...entry, reason: "" } : entry));
    expect(validateB1Artifact(B1_MECHANISM, unexplained))
      .toContain("temporal continuity, overshoot, flicker must record why it received that verdict");
  });
});
