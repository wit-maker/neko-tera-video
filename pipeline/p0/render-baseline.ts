import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ARTIFACT_RELATIVE_PATH, BASELINE } from "./contracts";
import { assertFixedInputs } from "./fixed-input";
import { argValue, pathFromRoot, run } from "./lib";
import { assertLocalFontBoundary } from "./verify-network";

const artifact = argValue("--artifact", ARTIFACT_RELATIVE_PATH);
const output = pathFromRoot(`${artifact}/baseline.mp4`);

assertFixedInputs();
assertLocalFontBoundary();
if (existsSync(output)) throw new Error(`Refusing to overwrite existing normal baseline: ${output}`);
mkdirSync(dirname(output), { recursive: true });
run(pathFromRoot("node_modules/.bin/remotion.cmd"), [
  "render", BASELINE.composition, output,
  `--frames=${BASELINE.clipStart}-${BASELINE.clipEnd}`, "--codec=h264", "--crf=16",
], "P0 baseline render");
console.log(output);
