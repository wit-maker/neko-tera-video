import { describe, expect, it } from "vitest";
import { P0B_WORKING_CONTRACT, validateP0bContract } from "./comparison-contract";

describe("P0b working comparison contract", () => {
  it("accepts the proposed working contract without making a selection", () => {
    expect(validateP0bContract(P0B_WORKING_CONTRACT)).toEqual([]);
    expect(P0B_WORKING_CONTRACT.evaluation.representationDecision).toBe("not-made");
  });

  it("rejects an enhancement treated as a base", () => {
    const invalid = structuredClone(P0B_WORKING_CONTRACT) as any;
    invalid.candidateSpace.base = ["X2"];
    expect(validateP0bContract(invalid)).toContain("candidate base contains a non-base representation");
  });

  it("rejects incomplete observable metadata", () => {
    const invalid = structuredClone(P0B_WORKING_CONTRACT);
    invalid.observableReferences[0].measurement.version = "";
    invalid.observableReferences[0].coordinateSpace = "";
    invalid.observableReferences[0].tolerance = undefined;
    expect(validateP0bContract(invalid)).toEqual(expect.arrayContaining([
      "observable jaw-lip-corner lacks measurement method/version",
      "observable jaw-lip-corner lacks coordinate space",
      "observable jaw-lip-corner needs tolerance or comparison method",
    ]));
  });

  it("rejects a quality or representation decision inferred from conformance pass", () => {
    const invalid = structuredClone(P0B_WORKING_CONTRACT) as any;
    invalid.conformance.status = "pass";
    invalid.evaluation.representationDecision = "choose-A";
    expect(validateP0bContract(invalid)).toContain("conformance pass must not infer a quality or representation decision");
  });
});
