import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readReceipt, resolveBlender, verifyArchiveIdentity } from "./blender";
import { validateDManifest, type DManifest } from "./conformance";

/**
 * M3-06 orchestrator: resolve the M3-01 Blender, run the headless build, check
 * the manifest, and write a receipt recording where the tool actually was.
 *
 * `--factory-startup` keeps the build deterministic and guarantees no user
 * add-on participates. `--offline-mode` keeps Blender from reaching the network.
 * No render is requested.
 */

const OUT_DIR = resolve("out/m3/d");
const BLEND = resolve(OUT_DIR, "d-native.blend");
const MANIFEST = resolve(OUT_DIR, "d-manifest.json");
const RECEIPT = resolve("pipeline/m3/d/build-receipt.json");

const receipt = readReceipt();
const blender = resolveBlender(receipt);
const identity = verifyArchiveIdentity(blender);

mkdirSync(OUT_DIR, { recursive: true });
const args = [
  "--background", "--factory-startup", "--offline-mode",
  "--python", resolve("pipeline/m3/d/build_asset.py"),
  "--", "--out", BLEND, "--manifest", MANIFEST,
];
console.log(`blender: ${blender.executable} (resolved from ${blender.source})`);
console.log(`archive identity: ${identity.reason}`);
execFileSync(blender.executable, args, { stdio: "inherit" });

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as DManifest;
const errors = validateDManifest(manifest);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

writeFileSync(
  RECEIPT,
  `${JSON.stringify(
    {
      schemaVersion: "m3-d-build-receipt-v1",
      task: "M3-06",
      toolResolvedFrom: blender.source,
      toolExecutable: blender.executable,
      toolVersion: manifest.blenderVersion,
      declaredVersion: blender.declaredVersion,
      archiveIdentity: identity,
      buildCommand: `blender ${args.slice(0, 5).join(" ")} -- --out <blend> --manifest <json>`,
      renderPerformed: false,
      addonsInstalledByThisTask: manifest.addonsInstalledByThisTask,
      manifest,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
console.log(`M3-06 Base D native 2.5D asset built and validated; receipt written to ${RECEIPT}. No render, ranking, or representation decision was made.`);
