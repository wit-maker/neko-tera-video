import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ARTIFACT_RELATIVE_PATH, BASELINE, type EvaluationStatus } from "./contracts";
import { argValue, pathFromRoot, readJson, run, writeJson } from "./lib";

const artifact = argValue("--artifact", ARTIFACT_RELATIVE_PATH);
const baseline = pathFromRoot(`${artifact}/baseline.mp4`);
const conformance = readJson<{ status: "pass" | "fail" }>(pathFromRoot(`${artifact}/conformance.json`));
if (!existsSync(baseline)) throw new Error(`Baseline is missing: ${baseline}`);
if (conformance.status !== "pass") throw new Error("Evaluation is blocked by failed conformance; do not treat invalid artifacts as review material.");
const review = pathFromRoot(`${artifact}/review`);
mkdirSync(review, { recursive: true });

const stills = BASELINE.stills.map((still) => {
  const stem = `local-${String(still.localFrame).padStart(3, "0")}_global-${still.globalFrame}`;
  const stillPath = `${review}/${stem}.png`;
  const cropPath = `${review}/mouth-${stem}.png`;
  // select evaluates decoded frame indices, making the fixed local frames explicit.
  run("ffmpeg", ["-y", "-v", "error", "-i", baseline, "-vf", `select=eq(n\\,${still.localFrame})`, "-frames:v", "1", stillPath], `extract still ${still.localFrame}`);
  run("ffmpeg", ["-y", "-v", "error", "-i", stillPath, "-vf", `crop=${BASELINE.crop.width}:${BASELINE.crop.height}:${BASELINE.crop.x}:${BASELINE.crop.y},scale=${BASELINE.crop.displayWidth}:${BASELINE.crop.displayHeight}`, cropPath], `crop still ${still.localFrame}`);
  return { ...still, still: `review/${stem}.png`, mouthCrop: `review/mouth-${stem}.png` };
});

const status: EvaluationStatus = "evaluated";
const evaluation = {
  contract: "p0-proof-vertical-slice/v1",
  status,
  playback: { normal: 1, quarterSpeed: { mechanism: "HTMLVideoElement.playbackRate", value: 0.25, derivedVideo: false } },
  stills,
  observations: [],
  knownFailureIds: [],
  qualityDecision: "not-assessed",
  representationDecision: "not-assessed",
};
writeJson(pathFromRoot(`${artifact}/evaluation.json`), evaluation);
console.log(JSON.stringify(evaluation, null, 2));
