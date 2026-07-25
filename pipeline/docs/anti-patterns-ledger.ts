import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..", "..");
const LEDGER_PATH = join(REPOSITORY_ROOT, "docs", "anti-patterns.md");

/** `docs/anti-patterns.md` の「1件の必須項目」表と同じ順序・同じ表記。 */
export const CANONICAL_FIELD_LABELS = ["状態", "観測日", "文脈", "観測事実", "証拠", "根本原因", "禁止パターン", "代替策", "適用範囲", "昇格先"] as const;

export interface AntiPatternEntry {
  id: string;
  labels: string[];
}

export function readLedger(): string {
  return readFileSync(LEDGER_PATH, "utf8");
}

export function parseAntiPatternEntries(markdown: string): AntiPatternEntry[] {
  const entries: AntiPatternEntry[] = [];
  let current: AntiPatternEntry | undefined;
  for (const raw of markdown.split(/\r?\n/)) {
    const heading = /^### (AP-\d+):/.exec(raw);
    if (heading) {
      current = { id: heading[1], labels: [] };
      entries.push(current);
      continue;
    }
    if (raw.startsWith("## ")) {
      current = undefined;
      continue;
    }
    if (!current || !raw.startsWith("- ")) continue;
    const field = raw.slice(2);
    const separator = field.indexOf(": ");
    // ラベルとしても本文としても読めない行は、ラベル位置の文字列をそのまま診断へ渡す。
    current.labels.push(separator === -1 ? field : field.slice(0, separator));
  }
  return entries;
}

export function validateAntiPatternLabels(markdown: string): string[] {
  const entries = parseAntiPatternEntries(markdown);
  const problems: string[] = [];
  if (entries.length === 0) problems.push("no AP-### entry was found");
  for (const entry of entries) {
    for (const [index, label] of CANONICAL_FIELD_LABELS.entries()) {
      const found = entry.labels[index];
      if (found === label) continue;
      problems.push(found === undefined
        ? `${entry.id}: field ${index + 1} must be ${label} but the entry has only ${entry.labels.length} field(s)`
        : `${entry.id}: field ${index + 1} must be ${label} but was ${found}`);
    }
    for (const extra of entry.labels.slice(CANONICAL_FIELD_LABELS.length)) {
      problems.push(`${entry.id}: unexpected extra field ${extra}`);
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const problems = validateAntiPatternLabels(readLedger());
  for (const problem of problems) console.error(problem);
  console.log(problems.length === 0 ? "docs/anti-patterns.md: field labels OK" : `docs/anti-patterns.md: ${problems.length} label problem(s)`);
  process.exitCode = problems.length === 0 ? 0 : 1;
}
