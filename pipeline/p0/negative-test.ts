import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { spawnSync } from "node:child_process";
import { ARTIFACT_RELATIVE_PATH } from "./contracts";
import { argValue, pathFromRoot, sha256 } from "./lib";

const artifact = argValue("--artifact", ARTIFACT_RELATIVE_PATH);
const normal = pathFromRoot(`${artifact}/baseline.mp4`);
const fixtureRoot = pathFromRoot(`${artifact}/fixtures`);
const normalHashBefore = sha256(normal);
mkdirSync(fixtureRoot, { recursive: true });
const wrong = `${fixtureRoot}/wrong-frame-count.mp4`;
const truncated = `${fixtureRoot}/truncated.mp4`;
const encode = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", normal, "-frames:v", "618", "-an", "-c:v", "libx264", "-crf", "16", wrong], { cwd: process.cwd(), encoding: "utf8" });
if (encode.status !== 0) throw new Error(`wrong-frame-count fixture failed: ${encode.stderr}`);
const bytes = readFileSync(normal);
writeFileSync(truncated, bytes.subarray(0, Math.floor(bytes.length * 0.8)));
const normalHashAfter = sha256(normal);
if (normalHashBefore !== normalHashAfter) throw new Error("Negative fixtures changed the normal baseline.");

function validateFixture(file: string): boolean {
  const staged = `${fixtureRoot}/staged`;
  mkdirSync(staged, { recursive: true });
  copyFileSync(file, `${staged}/baseline.mp4`);
  copyFileSync(pathFromRoot(`${artifact}/manifest.json`), `${staged}/manifest.json`);
  const result = spawnSync(process.execPath, [pathFromRoot("node_modules/tsx/dist/cli.mjs"), pathFromRoot("pipeline/p0/validate.ts"), "--artifact", `${artifact}/fixtures/staged`], { cwd: process.cwd(), encoding: "utf8" });
  return result.status !== 0;
}
const wrongFails = validateFixture(wrong);
const truncatedFails = validateFixture(truncated);
if (!wrongFails || !truncatedFails) throw new Error(`Negative conformance test did not fail: wrong=${wrongFails}, truncated=${truncatedFails}`);
console.log(JSON.stringify({ normalHashBefore, normalHashAfter, fixtures: [{ file: basename(wrong), bytes: statSync(wrong).size, conformanceFailed: wrongFails }, { file: basename(truncated), bytes: statSync(truncated).size, conformanceFailed: truncatedFails }] }, null, 2));
