import { existsSync } from "node:fs";
import { ARTIFACT_RELATIVE_PATH, BASELINE, BASELINE_SOURCE_COMMIT, P0_LOCAL_FONT_SHA256, P0_LOCAL_FONT_SOURCE_OVERRIDES } from "./contracts";
import { assertFixedInputs } from "./fixed-input";
import { argValue, pathFromRoot, readJson, run, sha256, writeJson } from "./lib";

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
  localFontProvenance: {
    sourceOverrides: P0_LOCAL_FONT_SOURCE_OVERRIDES,
    assets: P0_LOCAL_FONT_SHA256,
    networkBoundary: "local-only; verified before render",
  },
  toolVersions: {
    node: version("node", ["--version"]),
    npm: version(process.platform === "win32" ? "npm.cmd" : "npm", ["--version"]),
    remotion: readJson<{ version: string }>(pathFromRoot("node_modules/@remotion/cli/package.json")).version,
    ffmpeg: version("ffmpeg", ["-version"]),
    ffprobe: version("ffprobe", ["-version"]),
  },
};
writeJson(pathFromRoot(`${artifact}/manifest.json`), manifest);
console.log(JSON.stringify(manifest, null, 2));
