import { describe, expect, it } from "vitest";
import {
  BASES_WITHOUT_RUNTIME_OCCLUSION,
  OCCLUSION_EVIDENCE,
  OCCLUSION_EVIDENCE_STATUS,
  outstandingEvidence,
  validateOcclusionEvidence,
  type OcclusionEvidence,
} from "./occlusion-evidence";

const evidenceFor = (base: string) => OCCLUSION_EVIDENCE.find((entry) => entry.base === base)!;
const sound = (): OcclusionEvidence => structuredClone(evidenceFor("C"));

describe("cross-method occlusion evidence contract", () => {
  it("is a PoC acceptance condition, not an adopted contract", () => {
    expect(OCCLUSION_EVIDENCE_STATUS).toBe("PROPOSED");
  });

  it("records each method's mechanism rather than flattening them together", () => {
    // The comparison exists because the mechanisms differ. A matrix that
    // normalised them would destroy the thing P1 is measuring.
    const mechanisms = OCCLUSION_EVIDENCE.map((entry) => entry.mechanism);
    expect(new Set(mechanisms).size).toBe(mechanisms.length);
    expect(evidenceFor("C").mechanism).toBe("2d-aperture-mask");
    expect(evidenceFor("D").mechanism).toBe("layer-depth-order");
    expect(evidenceFor("E").mechanism).toBe("volume-containment");
  });

  it("explains the bases with no runtime occlusion instead of leaving them missing", () => {
    for (const base of ["A", "B1", "B2"] as const) {
      expect(BASES_WITHOUT_RUNTIME_OCCLUSION[base]).toBeTruthy();
      expect(OCCLUSION_EVIDENCE.some((entry) => entry.base === base)).toBe(false);
    }
  });

  it("accepts C, whose evidence is complete", () => {
    expect(validateOcclusionEvidence(evidenceFor("C"))).toEqual([]);
  });

  it("reports D and E as short of the contract, because they are", () => {
    // Not a defect in this module. C could be swept without rendering; D and E
    // cannot, so their occlusion is established for the rest pose only. The
    // matrix must carry that asymmetry rather than present three equal claims.
    const outstanding = outstandingEvidence();
    expect(Object.keys(outstanding).sort()).toEqual(["D", "E"]);
    for (const base of ["D", "E"] as const) {
      expect(outstanding[base].join(" ")).toMatch(/control range was not swept/);
      expect(evidenceFor(base).controlRangeDescription).toMatch(/NOT SWEPT/);
    }
  });

  it("requires every method to say what its evidence does not establish", () => {
    for (const entry of OCCLUSION_EVIDENCE) {
      expect(entry.notEstablished.length).toBeGreaterThan(0);
      expect(entry.notEstablished.join(" ")).toMatch(/appearance/i);
    }
  });
});

describe("the contract catches each failure it was written from", () => {
  it("AP-010: rejects a claim that only checks the visible side", () => {
    expect(validateOcclusionEvidence({ ...sound(), hiddenStateVerified: false }).join(" "))
      .toMatch(/showing the interior appear does not show it ever disappears \(AP-010\)/);
  });

  it("AP-012: rejects figures read back from what the builder wrote", () => {
    const circular = sound();
    circular.measurement.independentOfAuthoredValues = false;
    expect(validateOcclusionEvidence(circular).join(" ")).toMatch(/can only confirm its own intent \(AP-012\)/);
  });

  it("AP-012: rejects a number never checked against an independent reference", () => {
    const unchecked = sound();
    unchecked.measurement.crossCheckedAgainstIndependentReference = false;
    expect(validateOcclusionEvidence(unchecked).join(" "))
      .toMatch(/directional properties cannot see a uniformly wrong number \(AP-012\)/);
  });

  it("AP-013: rejects a claim tested only at the range endpoints", () => {
    expect(validateOcclusionEvidence({ ...sound(), controlRangeSwept: false }).join(" "))
      .toMatch(/both C defects lived strictly inside it \(AP-013\)/);
  });

  it("rejects an unnamed mechanism or base", () => {
    expect(validateOcclusionEvidence({ ...sound(), mechanism: "vibes" as OcclusionEvidence["mechanism"] }).join(" "))
      .toMatch(/unknown occlusion mechanism/);
    expect(validateOcclusionEvidence({ ...sound(), base: "Z" as OcclusionEvidence["base"] }).join(" ")).toMatch(/unknown base/);
  });
});
