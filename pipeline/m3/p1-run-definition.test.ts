import { describe, expect, it } from "vitest";
import { P1_TRACK_A_RUN_DEFINITION, validateP1TrackARunDefinition } from "./p1-run-definition";

describe("M3-00 P1 Track A run definition", () => {
  it("accepts the fixed Track A PoC scope without running it", () => {
    expect(validateP1TrackARunDefinition(P1_TRACK_A_RUN_DEFINITION)).toEqual([]);
    expect(P1_TRACK_A_RUN_DEFINITION.conformance.status).toBe("not-run");
  });
  it("rejects a changed candidate set", () => {
    const invalid = structuredClone(P1_TRACK_A_RUN_DEFINITION);
    invalid.candidates = invalid.candidates.filter((candidate) => candidate.base !== "E");
    expect(validateP1TrackARunDefinition(invalid)).toEqual(expect.arrayContaining([
      "candidate set must be exactly A/B1/B2/C/D/E",
      "E must be a core candidate with T0/T1/T3/T6/T7/T9",
      "E must reference the accepted Blender receipt",
    ]));
  });
  it("rejects changed sequence scope", () => {
    const invalid = structuredClone(P1_TRACK_A_RUN_DEFINITION);
    invalid.candidates.find((candidate) => candidate.base === "C")!.sequenceIds = ["T0"];
    invalid.candidates.find((candidate) => candidate.base === "B2")!.sequenceIds = ["T1", "T3", "T9"];
    expect(validateP1TrackARunDefinition(invalid)).toEqual(expect.arrayContaining(["C must be a core candidate with T0/T1/T3/T6/T7/T9", "B2 must be limited to the T1/T3/T8 quality-ceiling control"]));
  });
  it("rejects altered view, budget, and Track B", () => {
    const invalid = structuredClone(P1_TRACK_A_RUN_DEFINITION);
    invalid.viewConstraints.T7.yawDegrees.max = 16;
    invalid.candidates.find((candidate) => candidate.base === "A")!.budget.operatorHours = 9;
    invalid.trackB.inScope = true;
    expect(validateP1TrackARunDefinition(invalid)).toEqual(expect.arrayContaining(["T7 must fix yaw [-15, +15] and pitch [-10, +10]", "A must use the fixed core Track A budget", "M3-00 must fix Track A and exclude Track B"]));
  });
  it("rejects missing local network enforcement precondition", () => {
    const invalid = structuredClone(P1_TRACK_A_RUN_DEFINITION);
    invalid.renderNetworkPrecondition.acceptedEvidence = "Firewall evidence recorded.";
    expect(validateP1TrackARunDefinition(invalid)).toContain("render requires recorded local outbound-block/loopback-only evidence and remains disallowed in M3-00");
  });
});
