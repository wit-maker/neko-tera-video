import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BASELINE } from "../../p0/contracts";
import {
  P0_PROBE_ENTRIES,
  cropScaleArgs,
  decodeAllFramesArgs,
  differenceFilterExpr,
  extractFrameArgs,
  frameDifferenceArgs,
  frameDifferenceRawArgs,
  probeStreamArgs,
  toolVersions,
} from "./media";

const BASELINE_PATH = "out/p0/a-s7c6-e43ebb2/baseline.mp4";

// ---------------------------------------------------------------------------
// Argv golden tests. Each expected array below is copied verbatim from the
// P0 source line it pins (file:line noted in each test name/comment). If a
// golden test here needs to change to keep passing, that is the STOP
// condition from the packet: P0 must not change, so the test failing means
// stop and report, not "fix" P0's argv.
// ---------------------------------------------------------------------------

describe("argv golden: pipeline/p0/validate.ts", () => {
  it("ffprobe call (validate.ts:19) matches byte-for-byte", () => {
    const expected = [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-count_frames",
      "-show_entries",
      "stream=nb_read_frames,avg_frame_rate,width,height",
      "-of",
      "json",
      BASELINE_PATH,
    ];
    expect(probeStreamArgs(BASELINE_PATH, P0_PROBE_ENTRIES)).toEqual(expected);
  });

  it("ffmpeg all-frame decode call (validate.ts:28) matches byte-for-byte", () => {
    const expected = ["-v", "error", "-i", BASELINE_PATH, "-map", "0:v:0", "-f", "null", "-"];
    expect(decodeAllFramesArgs(BASELINE_PATH)).toEqual(expected);
  });
});

describe("argv golden: pipeline/p0/evaluate.ts", () => {
  it("ffmpeg still-extraction call (evaluate.ts:19) matches byte-for-byte for every BASELINE still", () => {
    for (const still of BASELINE.stills) {
      const stillPath = `review/local-${String(still.localFrame).padStart(3, "0")}_global-${still.globalFrame}.png`;
      const expected = [
        "-y",
        "-v",
        "error",
        "-i",
        BASELINE_PATH,
        "-vf",
        `select=eq(n\\,${still.localFrame})`,
        "-frames:v",
        "1",
        stillPath,
      ];
      expect(extractFrameArgs(BASELINE_PATH, still.localFrame, stillPath)).toEqual(expected);
    }
  });

  it("ffmpeg mouth-crop call (evaluate.ts:20) matches byte-for-byte", () => {
    const stillPath = "review/local-000_global-17617.png";
    const cropPath = "review/mouth-local-000_global-17617.png";
    const expected = [
      "-y",
      "-v",
      "error",
      "-i",
      stillPath,
      "-vf",
      `crop=${BASELINE.crop.width}:${BASELINE.crop.height}:${BASELINE.crop.x}:${BASELINE.crop.y},scale=${BASELINE.crop.displayWidth}:${BASELINE.crop.displayHeight}`,
      cropPath,
    ];
    expect(cropScaleArgs(stillPath, BASELINE.crop, cropPath)).toEqual(expected);
  });
});

describe("argv golden: pipeline/p0/visual-integrity.ts", () => {
  const localFrame = BASELINE.stills[1].localFrame; // 309, exercises a non-zero frame index too
  const stillPath = `review/local-${String(localFrame).padStart(3, "0")}_global-${BASELINE.stills[1].globalFrame}.png`;

  it("differenceFilter expression matches byte-for-byte", () => {
    const expected = `[0:v]select=eq(n\\,${localFrame}),setpts=PTS-STARTPTS,format=rgb24[baseline];[1:v]setpts=PTS-STARTPTS,format=rgb24[still];[baseline][still]blend=all_mode=difference,format=rgb24[diff]`;
    expect(differenceFilterExpr(localFrame)).toBe(expected);
  });

  it("ffmpeg raw-rgb24-stdout call (visual-integrity.ts:20, rawDifference) matches byte-for-byte", () => {
    const expected = [
      "-v",
      "error",
      "-i",
      BASELINE_PATH,
      "-i",
      stillPath,
      "-filter_complex",
      differenceFilterExpr(localFrame),
      "-map",
      "[diff]",
      "-frames:v",
      "1",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-",
    ];
    expect(frameDifferenceRawArgs(BASELINE_PATH, stillPath, localFrame)).toEqual(expected);
  });

  it("ffmpeg rendered-diff-PNG call (visual-integrity.ts:30) matches byte-for-byte", () => {
    const diffPath = `review/diff-local-${String(localFrame).padStart(3, "0")}_global-${BASELINE.stills[1].globalFrame}.png`;
    const expected = [
      "-y",
      "-v",
      "error",
      "-i",
      BASELINE_PATH,
      "-i",
      stillPath,
      "-filter_complex",
      differenceFilterExpr(localFrame),
      "-map",
      "[diff]",
      "-frames:v",
      "1",
      diffPath,
    ];
    expect(frameDifferenceArgs(BASELINE_PATH, stillPath, localFrame, diffPath)).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// toolVersions: a light real-process smoke test (no fixture media needed).
// ffmpeg/ffprobe presence on PATH is this packet's STOP condition, so if
// this fails in CI, the packet's precondition isn't met there.
// ---------------------------------------------------------------------------

describe("toolVersions", () => {
  it("reports non-empty ffmpeg/ffprobe version lines without pinning a specific version", () => {
    const versions = toolVersions();
    expect(versions.ffmpeg.toLowerCase()).toContain("ffmpeg version");
    expect(versions.ffprobe.toLowerCase()).toContain("ffprobe version");
  });
});

// ---------------------------------------------------------------------------
// Repo convention test: media.ts must be the only ffmpeg/ffprobe spawn point
// under pipeline/m3/p1/**. This scans the directory dynamically (rather
// than a fixed file list) so it also catches files other packets add later,
// e.g. p1-i1's sequence.ts.
// ---------------------------------------------------------------------------

const P1_DIR = dirname(fileURLToPath(import.meta.url));
const MEDIA_TS = join(P1_DIR, "media.ts");

function listTsFilesRecursively(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listTsFilesRecursively(full);
    return entry.name.endsWith(".ts") ? [full] : [];
  });
}

// Matches spawning ffmpeg/ffprobe via node:child_process directly, or via
// pipeline/p0/lib.ts's run()/runResult() — both are how P0 itself does it,
// so both are exactly what a bypassing future file would look like.
const SPAWN_CALL_PATTERN = /\b(?:spawn|spawnSync|execFile|execFileSync|exec|execSync|run|runResult)\s*\(\s*(["'`])ff(?:mpeg|probe)\1/;

describe("repo convention: media.ts is the only ffmpeg/ffprobe entry point under pipeline/m3/p1/**", () => {
  it("finds no ffmpeg/ffprobe spawn call in any other file", () => {
    const offenders = listTsFilesRecursively(P1_DIR)
      .filter((file) => file !== MEDIA_TS)
      .filter((file) => SPAWN_CALL_PATTERN.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
