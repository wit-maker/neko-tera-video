import { describe, expect, it } from "vitest";
import { CANONICAL_FIELD_LABELS, parseAntiPatternEntries, readLedger, validateAntiPatternLabels } from "./anti-patterns-ledger";

describe("docs/anti-patterns.md field labels", () => {
  it("uses the canonical label set on every recorded entry", () => {
    const markdown = readLedger();
    expect(validateAntiPatternLabels(markdown)).toEqual([]);
    expect(parseAntiPatternEntries(markdown).map((entry) => entry.id)).toContain("AP-009");
  });

  it("detects a CP932/UTF-8 mojibake label, which is how AP-009 was corrupted (AP-006)", () => {
    const corrupted = [
      "### AP-999: sample",
      "",
      "- 迥ｶ諷・ `active`",
      "- 隕ｳ貂ｬ譌･: 2026-07-23",
      "",
    ].join("\n");
    expect(validateAntiPatternLabels(corrupted)).toEqual(expect.arrayContaining([
      "AP-999: field 1 must be 状態 but was 迥ｶ諷・ `active`",
      "AP-999: field 2 must be 観測日 but was 隕ｳ貂ｬ譌･",
      "AP-999: field 3 must be 文脈 but the entry has only 2 field(s)",
    ]));
  });

  it("detects a reordered or renamed field", () => {
    const reordered = ["### AP-998: sample", "", ...CANONICAL_FIELD_LABELS.map((label) => `- ${label === "証拠" ? "根拠" : label}: x`), ""].join("\n");
    expect(validateAntiPatternLabels(reordered)).toEqual(["AP-998: field 5 must be 証拠 but was 根拠"]);
  });

  it("ignores the required-field table and prose outside AP entries", () => {
    expect(validateAntiPatternLabels("| 項目 | 内容 |\n| 状態 | x |\n- 状態: not in an entry\n")).toEqual(["no AP-### entry was found"]);
  });
});
