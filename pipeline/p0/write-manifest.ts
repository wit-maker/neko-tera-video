import { existsSync } from "node:fs";
import { ARTIFACT_RELATIVE_PATH, BASELINE, BASELINE_SOURCE_COMMIT } from "./contracts";
import { assertFixedInputs } from "./fixed-input";
import { argValue, pathFromRoot, run, sha256, writeJson } from "./lib";

const artifact = argValue("--artifact", ARTIFACT_RELATIVE_PATH);
const baseline = pathFromRoot(`${artifact}/baseline.mp4`);
if (!existsSync(baseline)) throw new Error(`Baseline is missing: ${baseline}`);
const verification = assertFixedInputs();
const version = (command: string, args: string[]) => run(command, args).split(/\r?\n/, 1)[0];
const manifest = {
  contract: "p0-proof-vertical-slice/v1",
  baselineSourceCommit: BASELINE_SOURCE_COMMIT,
  p0ToolCommit: run("git", ["rev-parse", "HEAD"]),
  artifactRelativePath: artifact.replaceAll("\\", "/"),
  baselineCommand: ".\\node_modules\\.bin\\remotion.cmd render Main out\\p0\\a-s7c6-e43ebb2\\baseline.mp4 --frames=17617-18235 --codec=h264 --crf=16",
  baseline: { ...BASELINE, sha256: sha256(baseline) },
  inputs: verification,
  toolVersions: {
    node: version("node", ["--version"]),
    npm: version("npm", ["--version"]),
    remotion: version(pathFromRoot("node_modules/.bin/remotion.cmd"), ["--version"]),
    ffmpeg: version("ffmpeg", ["-version"]),
    ffprobe: version("ffprobe", ["-version"]),
  },
};
writeJson(pathFromRoot(`${artifact}/manifest.json`), manifest);
console.log(JSON.stringify(manifest, null, 2));
