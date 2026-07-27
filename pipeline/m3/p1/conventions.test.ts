import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Conventions that keep the P1 media boundary intact.
 *
 * These are scanners, and a scanner that finds nothing passes for the wrong
 * reason. An earlier version of these checks lived inside `media.test.ts`,
 * resolved its directory from `import.meta.url`, and reported zero offenders
 * even with a deliberately violating file sitting beside it -- it was green
 * while checking nothing. Every scan here therefore asserts what it found
 * before asserting what it did not.
 *
 * The directory is resolved from `process.cwd()`, the same way
 * `pipeline/p0/lib.ts` resolves `root`, because every script in this repository
 * already assumes it runs from the repository root.
 */

const P1_DIR = resolve(process.cwd(), "pipeline/m3/p1");
const MEDIA_TS = join(P1_DIR, "media.ts");

function listTsFilesRecursively(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listTsFilesRecursively(full);
    return entry.name.endsWith(".ts") ? [full] : [];
  });
}

/**
 * Source with comments stripped, so prose cannot trip a scanner.
 *
 * Block comments are stripped as well as line comments. Documenting a
 * forbidden call is not making one, and a doc comment naming it flagged this
 * very file until block comments were handled.
 */
const codeOf = (file: string): string =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");

/** Spawning ffmpeg/ffprobe directly, or through pipeline/p0/lib.ts's run/runResult. */
const SPAWN_CALL_PATTERN = /\b(?:spawn|spawnSync|execFile|execFileSync|exec|execSync|run|runResult)\s*\(\s*(["'`])ff(?:mpeg|probe)\1/;

/** `toolVersions()` with no injected runner spawns the tool. */
const SPAWNING_TOOL_VERSIONS = /\btoolVersions\s*\(\s*\)/;

describe("P1 media boundary conventions", () => {
  const files = listTsFilesRecursively(P1_DIR);

  it("actually scans the P1 directory", () => {
    // Without this, every check below would pass on an empty scan.
    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files).toContain(MEDIA_TS);
    expect(files.some((file) => file.endsWith(".test.ts"))).toBe(true);
  });

  it("keeps media.ts as the only ffmpeg/ffprobe spawn point", () => {
    const offenders = files.filter((file) => file !== MEDIA_TS).filter((file) => SPAWN_CALL_PATTERN.test(codeOf(file)));
    expect(offenders).toEqual([]);
  });

  it("keeps every test free of a host-tool dependency", () => {
    // CI has no ffmpeg. A test that spawns one passes on a developer machine
    // and fails in CI, which is exactly how this suite broke once.
    const offenders = files
      .filter((file) => file.endsWith(".test.ts"))
      .filter((file) => {
        const code = codeOf(file);
        return SPAWNING_TOOL_VERSIONS.test(code) || SPAWN_CALL_PATTERN.test(code);
      });
    expect(offenders).toEqual([]);
  });

  it("detects a violation rather than passing vacuously", () => {
    // The scanners above are only worth having if they fire. Prove it on
    // synthetic sources.
    //
    // Each fixture is assembled at run time rather than written as a literal,
    // because a literal would make this very file an offender and the scans
    // above would flag it. Building the string keeps the file clean while
    // still exercising the exact pattern.
    const ff = "ff" + "mpeg";
    const spawning = `const out = run("${ff}", ["-version"]);`;
    const bareVersions = "const v = tool" + "Versions();";
    const injected = "const v = tool" + "Versions(fakeRunner);";
    const commented = "// tool" + "Versions() would spawn the tool";

    expect(SPAWN_CALL_PATTERN.test(spawning)).toBe(true);
    expect(SPAWNING_TOOL_VERSIONS.test(bareVersions)).toBe(true);
    // An injected runner does not spawn, so it must not be flagged.
    expect(SPAWNING_TOOL_VERSIONS.test(injected)).toBe(false);
    // Prose must not trip the scan; `codeOf` strips line comments first.
    expect(SPAWNING_TOOL_VERSIONS.test(commented.replace(/\/\/.*$/, ""))).toBe(false);
  });
});
