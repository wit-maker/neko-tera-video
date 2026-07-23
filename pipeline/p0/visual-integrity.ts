import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { ARTIFACT_RELATIVE_PATH, BASELINE } from "./contracts";
import { argValue, pathFromRoot, readJson, requireFile, sha256, writeJson } from "./lib";
import { maximumByteDifference, visualIntegrityStatus } from "./visual-integrity-lib";

const artifact = argValue("--artifact", ARTIFACT_RELATIVE_PATH);
const baseline = pathFromRoot(`${artifact}/baseline.mp4`);
const evaluation = readJson<{ status: "evaluated" | "not_evaluated"; stills: Array<{ localFrame: number; globalFrame: number; still: string }> }>(pathFromRoot(`${artifact}/evaluation.json`));
const conformance = readJson<{ status: "pass" | "fail" }>(pathFromRoot(`${artifact}/conformance.json`));
if (!existsSync(baseline)) throw new Error(`Baseline is missing: ${baseline}`);
if (conformance.status !== "pass") throw new Error("Visual integrity is blocked by failed conformance.");
if (evaluation.status !== "evaluated") throw new Error("Visual integrity is blocked until review stills are evaluated.");

function differenceFilter(localFrame: number): string {
  return `[0:v]select=eq(n\\,${localFrame}),setpts=PTS-STARTPTS,format=rgb24[baseline];[1:v]setpts=PTS-STARTPTS,format=rgb24[still];[baseline][still]blend=all_mode=difference,format=rgb24[diff]`;
}

function rawDifference(localFrame: number, stillPath: string): Uint8Array {
  const result = spawnSync("ffmpeg", ["-v", "error", "-i", baseline, "-i", stillPath, "-filter_complex", differenceFilter(localFrame), "-map", "[diff]", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { cwd: process.cwd(), encoding: null, maxBuffer: BASELINE.width * BASELINE.height * 3 + 1024 });
  if (result.error || result.status !== 0) throw new Error(`visual integrity metric failed for local frame ${localFrame}: ${result.stderr?.toString() || result.error?.message || "unknown error"}`);
  return result.stdout;
}

const checks = evaluation.stills.map((still) => {
  const stillPath = pathFromRoot(`${artifact}/${still.still}`);
  requireFile(stillPath);
  const diffRelativePath = `review/diff-local-${String(still.localFrame).padStart(3, "0")}_global-${still.globalFrame}.png`;
  const diffPath = pathFromRoot(`${artifact}/${diffRelativePath}`);
  const render = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", baseline, "-i", stillPath, "-filter_complex", differenceFilter(still.localFrame), "-map", "[diff]", "-frames:v", "1", diffPath], { cwd: process.cwd(), encoding: "utf8" });
  if (render.error || render.status !== 0) throw new Error(`visual integrity diff failed for local frame ${still.localFrame}: ${render.stderr || render.error?.message || "unknown error"}`);
  const maximumDifference = maximumByteDifference(rawDifference(still.localFrame, stillPath));
  return {
    localFrame: still.localFrame,
    globalFrame: still.globalFrame,
    baseline: { path: "baseline.mp4", sha256: sha256(baseline) },
    reviewStill: { path: still.still, sha256: sha256(stillPath) },
    difference: { path: diffRelativePath, sha256: sha256(diffPath) },
    metric: { name: "maximum-rgb-byte-difference", value: maximumDifference, expected: 0 },
    status: maximumDifference === 0 ? "pass" : "fail",
  };
});

const status = visualIntegrityStatus(checks.map((check) => check.metric.value));
const output = {
  contract: "p0-proof-vertical-slice/v1",
  purpose: "review-extraction-integrity-only; not quality, representation selection, or quarantined-artifact comparison",
  status,
  checks,
};
writeJson(pathFromRoot(`${artifact}/review/visual-integrity.json`), output);
console.log(JSON.stringify(output, null, 2));
if (status !== "pass") throw new Error("Review still visual integrity failed; do not use the review stills.");
