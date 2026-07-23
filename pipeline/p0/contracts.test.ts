import { describe, expect, it } from "vitest";
import { BINARY_SHA256, TRACKED_TEXT_BLOBS, reviewStatus } from "./contracts";
import { conformanceStatus } from "./validate";

describe("P0 contracts", () => {
  it("pins all seven mouth patches and the baseline pipeline identity", () => {
    expect(Object.keys(BINARY_SHA256).filter((path) => path.includes("/mouth/"))).toHaveLength(7);
    expect(TRACKED_TEXT_BLOBS["src/Main.tsx"]).toBe("6ef0d105363a01c07acc7861eccae8c889945dc1");
  });
  it("never turns conformance into a quality or representation decision", () => {
    expect(reviewStatus("pass", "evaluated", [])).toBe("review-ready");
    expect(reviewStatus("fail", "evaluated", [])).toBe("invalid");
    expect(reviewStatus("pass", "not_evaluated", [])).toBe("not-evaluated");
    expect(reviewStatus("pass", "evaluated", ["AP-001"])).toBe("known-failure");
  });
  it("requires every conformance check to pass", () => {
    expect(conformanceStatus([{ name: "decode", pass: true }])).toBe("pass");
    expect(conformanceStatus([{ name: "frame count", pass: false }])).toBe("fail");
  });
});
