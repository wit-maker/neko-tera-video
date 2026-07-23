import { existsSync } from "node:fs";
import { BASELINE_SOURCE_COMMIT, BINARY_SHA256, P0_LOCAL_FONT_SHA256, P0_LOCAL_FONT_SOURCE_OVERRIDES, TRACKED_TEXT_BLOBS } from "./contracts";
import { pathFromRoot, run, runResult, sha256 } from "./lib";

export type VerificationResult = { path: string; expected: string; actual: string; ok: boolean; kind: "git-blob" | "sha256" };

function currentCanonicalBlob(path: string): string {
  // --path applies repository clean filters, so CRLF worktrees are compared as canonical Git bytes.
  return run("git", ["hash-object", `--path=${path}`, path], `canonical blob ${path}`);
}

export function verifyFixedInputs(): VerificationResult[] {
  const results: VerificationResult[] = [];
  for (const [path, expected] of Object.entries(TRACKED_TEXT_BLOBS)) {
    const baselineBlob = run("git", ["rev-parse", `${BASELINE_SOURCE_COMMIT}:${path}`], `baseline blob ${path}`);
    const actual = currentCanonicalBlob(path);
    const override = P0_LOCAL_FONT_SOURCE_OVERRIDES.includes(path as typeof P0_LOCAL_FONT_SOURCE_OVERRIDES[number]);
    const clean = override ? runResult("git", ["diff", "--quiet", "--", path]).status === 0 : true;
    results.push({ path, expected, actual, ok: baselineBlob === expected && (override ? clean : actual === expected), kind: "git-blob" });
  }
  for (const [path, expected] of Object.entries(BINARY_SHA256)) {
    const absolute = pathFromRoot(path);
    const actual = existsSync(absolute) ? sha256(absolute) : "MISSING";
    results.push({ path, expected, actual, ok: actual === expected, kind: "sha256" });
  }
  for (const [path, expected] of Object.entries(P0_LOCAL_FONT_SHA256)) {
    const absolute = pathFromRoot(path);
    const actual = existsSync(absolute) ? sha256(absolute) : "MISSING";
    results.push({ path, expected, actual, ok: actual === expected, kind: "sha256" });
  }
  return results;
}

export function assertFixedInputs(): VerificationResult[] {
  const results = verifyFixedInputs();
  const failures = results.filter((result) => !result.ok);
  if (failures.length) throw new Error(`P0 fixed input verification failed: ${failures.map((item) => item.path).join(", ")}`);
  return results;
}

if (process.argv.includes("--verify")) {
  const results = assertFixedInputs();
  console.log(JSON.stringify({ baselineSourceCommit: BASELINE_SOURCE_COMMIT, verified: results }, null, 2));
}
