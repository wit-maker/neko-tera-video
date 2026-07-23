import { existsSync } from "node:fs";
import { ARTIFACT_RELATIVE_PATH, BASELINE, type ConformanceStatus } from "./contracts";
import { argValue, pathFromRoot, readJson, runResult, sha256, writeJson } from "./lib";

type Check = { name: string; pass: boolean; observed?: string; expected?: string };
export function conformanceStatus(checks: readonly Check[]): ConformanceStatus {
  return checks.every((check) => check.pass) ? "pass" : "fail";
}

export function validateArtifact(artifact: string) {
  const baseline = pathFromRoot(`${artifact}/baseline.mp4`);
  const manifestPath = pathFromRoot(`${artifact}/manifest.json`);
  const checks: Check[] = [];
  checks.push({ name: "baseline exists", pass: existsSync(baseline) });
  checks.push({ name: "manifest exists", pass: existsSync(manifestPath) });
  if (existsSync(baseline) && existsSync(manifestPath)) {
    const manifest = readJson<{ baseline: { sha256: string } }>(manifestPath);
    checks.push({ name: "baseline SHA-256", pass: sha256(baseline) === manifest.baseline.sha256, observed: sha256(baseline), expected: manifest.baseline.sha256 });
    const probe = runResult("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=nb_read_frames,avg_frame_rate,width,height", "-of", "json", baseline]);
    if (probe.status !== 0) {
      checks.push({ name: "ffprobe", pass: false, observed: probe.stderr.trim() });
    } else {
      const stream = JSON.parse(probe.stdout).streams?.[0] as { nb_read_frames?: string; avg_frame_rate?: string; width?: number; height?: number } | undefined;
      checks.push({ name: "frame count", pass: stream?.nb_read_frames === String(BASELINE.frameCount), observed: stream?.nb_read_frames, expected: String(BASELINE.frameCount) });
      checks.push({ name: "fps", pass: stream?.avg_frame_rate === "60/1", observed: stream?.avg_frame_rate, expected: "60/1" });
      checks.push({ name: "dimensions", pass: stream?.width === BASELINE.width && stream?.height === BASELINE.height, observed: `${stream?.width}x${stream?.height}`, expected: `${BASELINE.width}x${BASELINE.height}` });
    }
    const decode = runResult("ffmpeg", ["-v", "error", "-i", baseline, "-map", "0:v:0", "-f", "null", "-"]);
    checks.push({ name: "all-frame decode", pass: decode.status === 0, observed: decode.stderr.trim() || "ok" });
  }
  return {
    contract: "p0-proof-vertical-slice/v1",
    artifactRelativePath: artifact.replaceAll("\\", "/"),
    status: conformanceStatus(checks), checks,
    qualityDecision: "not-assessed", representationDecision: "not-assessed",
  };
}

if (process.argv[1]?.endsWith("validate.ts")) {
  const artifact = argValue("--artifact", ARTIFACT_RELATIVE_PATH);
  const conformance = validateArtifact(artifact);
  writeJson(pathFromRoot(`${artifact}/conformance.json`), conformance);
  console.log(JSON.stringify(conformance, null, 2));
  if (conformance.status === "fail") process.exitCode = 1;
}
