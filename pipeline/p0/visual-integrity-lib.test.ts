import { describe, expect, it } from "vitest";
import { maximumByteDifference, visualIntegrityStatus } from "./visual-integrity-lib";

describe("P0 review visual integrity metric", () => {
  it("accepts only zero-valued RGB difference data", () => {
    expect(maximumByteDifference(new Uint8Array([0, 0, 0]))).toBe(0);
    expect(maximumByteDifference(new Uint8Array([0, 7, 2]))).toBe(7);
    expect(visualIntegrityStatus([0, 0, 0])).toBe("pass");
    expect(visualIntegrityStatus([0, 1, 0])).toBe("fail");
  });
});
