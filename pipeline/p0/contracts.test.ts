import { describe, expect, it } from "vitest";
import { BINARY_SHA256, P0_APPROVED_TRACKED_OVERRIDE_BLOBS, P0_LOCAL_FONT_SHA256, TRACKED_TEXT_BLOBS, reviewStatus } from "./contracts";
import { conformanceStatus } from "./validate";

describe("P0 contracts", () => {
  it("pins all seven mouth patches and the baseline pipeline identity", () => {
    expect(Object.keys(BINARY_SHA256).filter((path) => path.includes("/mouth/"))).toHaveLength(7);
    expect(TRACKED_TEXT_BLOBS["src/Main.tsx"]).toBe("6ef0d105363a01c07acc7861eccae8c889945dc1");
  });
  it("permits only the approved local font assets and loader source overrides", () => {
    expect(Object.keys(P0_LOCAL_FONT_SHA256)).toHaveLength(4);
    expect(P0_APPROVED_TRACKED_OVERRIDE_BLOBS).toMatchObject({
      "src/components/ChalkBoard.tsx": "9186ab8111e12b60479eb3a61fa8c7c41ff85708",
      "src/components/KaraokeSubtitle.tsx": "d3be19c23ff1848b465613aeef688e3edd34dcb3",
      "src/schema.ts": "c357fd311841cf52f0989d8d4016e8e4849789fa",
      "package-lock.json": "808bdd1a6f6188fa55671f373bfa4f67be9036c8",
    });
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
