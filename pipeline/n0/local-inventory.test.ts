import { describe, expect, it } from "vitest";
import { createLocalInventory, determineDecision, type LocalCandidate } from "./local-inventory";

const candidate = (licenseDeclaration: LocalCandidate["licenseDeclaration"]): LocalCandidate => ({
  kind: "model-or-weight",
  path: "assets/test-model.safetensors",
  sha256: "A".repeat(64),
  licenseDeclaration,
});

describe("N0 local inventory decision", () => {
  it("requires owner approval when no local model evidence exists", () => {
    expect(determineDecision([]).state).toBe("blocked-awaiting-owner-external-approval");
  });

  it("rejects locally discovered models without a license declaration", () => {
    expect(determineDecision([candidate("not-present")]).state).toBe("local-no-go");
  });

  it("allows only a separately approved local spike after model and license evidence", () => {
    const result = determineDecision([candidate("assets/LICENSE")]);
    expect(result.state).toBe("ready-for-approved-local-spike");
    expect(result.rationale.join(" ")).toContain("does not approve a model run");
  });

  it("marks absent repository-local candidates explicitly", () => {
    const inventory = createLocalInventory("2026-07-23T00:00:00.000Z");
    expect(["present", "not-present"]).toContain(inventory.candidateEvidence.modelOrWeights);
    expect(["present", "not-present"]).toContain(inventory.candidateEvidence.datasets);
  });
});
