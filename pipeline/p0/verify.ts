import { ARTIFACT_RELATIVE_PATH } from "./contracts";
import { pathFromRoot, run } from "./lib";

const artifact = process.argv.includes("--artifact") ? process.argv[process.argv.indexOf("--artifact") + 1] : ARTIFACT_RELATIVE_PATH;
run(process.execPath, [pathFromRoot("node_modules/tsx/dist/cli.mjs"), pathFromRoot("pipeline/p0/fixed-input.ts"), "--verify"]);
run(process.execPath, [pathFromRoot("node_modules/tsx/dist/cli.mjs"), pathFromRoot("pipeline/p0/verify-network.ts"), "--verify"]);
run(process.execPath, [pathFromRoot("node_modules/tsx/dist/cli.mjs"), pathFromRoot("pipeline/p0/validate.ts"), "--artifact", artifact]);
run(process.execPath, [pathFromRoot("node_modules/tsx/dist/cli.mjs"), pathFromRoot("pipeline/p0/evaluate.ts"), "--artifact", artifact]);
run(process.execPath, [pathFromRoot("node_modules/tsx/dist/cli.mjs"), pathFromRoot("pipeline/p0/present.ts"), "--artifact", artifact]);
run(process.execPath, [pathFromRoot("node_modules/tsx/dist/cli.mjs"), pathFromRoot("pipeline/p0/negative-test.ts"), "--artifact", artifact]);
console.log(`P0 verification completed: ${artifact}`);
