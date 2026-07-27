/**
 * The single entry point for ffmpeg / ffprobe in `pipeline/m3/p1/**`.
 *
 * P0 has no such wrapper: `pipeline/p0/validate.ts`, `evaluate.ts` and
 * `visual-integrity.ts` each hand-roll their own argv. This module exists so
 * P1's render tracks probe/extract/diff media the same way instead of
 * re-deriving four slightly different argv sets. It reuses `run` /
 * `runResult` from `pipeline/p0/lib.ts` (which carry the Windows `.cmd` shim
 * handling) and does not change anything under `pipeline/p0/**`.
 *
 * Every `*Args` function here returns exactly the argv array a P0 call site
 * builds inline; `media.test.ts` asserts byte-identical equality against
 * literal copies of those P0 argv arrays (the "argv golden tests"). Do not
 * change an `*Args` function's output without re-checking those tests.
 */
import { spawnSync } from "node:child_process";
import { run, runResult } from "../../p0/lib";

// ---------------------------------------------------------------------------
// probeStream — pipeline/p0/validate.ts's ffprobe call site, widened.
// ---------------------------------------------------------------------------

/**
 * The four fields P0's `validate.ts` reads via ffprobe. Kept as a named
 * constant so the argv golden test can request exactly this subset and
 * compare it against the literal P0 call, while `probeStream` itself asks
 * for more (see `EXTENDED_PROBE_ENTRIES`).
 */
export const P0_PROBE_ENTRIES = ["nb_read_frames", "avg_frame_rate", "width", "height"] as const;

/**
 * Fields `probeStream` requests. P0 only reads `P0_PROBE_ENTRIES`; P0b's
 * artifact contract (`pipeline/p0b/comparison-contract.ts`) additionally
 * needs `color` and `alpha` to be filled in, so this wrapper probes
 * `pix_fmt` plus the four colour-metadata fields ffprobe can expose
 * (`color_range`, `color_space` (matrix coefficients), `color_transfer`,
 * `color_primaries`). Whether ffprobe can actually supply the latter four
 * depends on the source stream carrying that metadata in its bitstream
 * (e.g. H.264 VUI) — see `probeStream`'s return type, whose colour fields
 * are optional for exactly this reason.
 */
export const EXTENDED_PROBE_ENTRIES = [
  ...P0_PROBE_ENTRIES,
  "pix_fmt",
  "color_range",
  "color_space",
  "color_transfer",
  "color_primaries",
] as const;

/**
 * Builds the ffprobe argv for a `stream=...` entries probe. With no
 * `entries` argument this is `EXTENDED_PROBE_ENTRIES`; passing
 * `P0_PROBE_ENTRIES` reproduces `pipeline/p0/validate.ts`'s ffprobe call
 * byte-for-byte (see the golden test).
 */
export function probeStreamArgs(file: string, entries: readonly string[] = EXTENDED_PROBE_ENTRIES): string[] {
  return [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-count_frames",
    "-show_entries",
    `stream=${entries.join(",")}`,
    "-of",
    "json",
    file,
  ];
}

interface RawFfprobeStream {
  nb_read_frames?: string;
  avg_frame_rate?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  color_range?: string;
  color_space?: string;
  color_transfer?: string;
  color_primaries?: string;
}

export interface StreamProbe {
  /** Decoded frame count, from ffprobe's `nb_read_frames` (requires `-count_frames`). */
  frameCount: number;
  /** Raw `avg_frame_rate` string as ffprobe reports it, e.g. `"60/1"`. */
  averageFrameRate: string;
  width: number;
  height: number;
  /** ffmpeg pixel format, e.g. `"yuv420p"` or `"yuva420p"`. */
  pixelFormat?: string;
  /** `color_range`: `"tv"` (limited) or `"pc"` (full). */
  colorRange?: string;
  /** `color_space`: matrix coefficients, e.g. `"bt709"`. */
  colorSpace?: string;
  /** `color_transfer`: transfer characteristics, e.g. `"bt709"`. */
  colorTransfer?: string;
  /** `color_primaries`, e.g. `"bt709"`. */
  colorPrimaries?: string;
}

/**
 * Probes the first video stream of `file`. Throws if ffprobe fails or the
 * required fields (frame count / frame rate / dimensions) are missing.
 * `pixelFormat` and the colour fields are `undefined` rather than throwing
 * when ffprobe/the source stream doesn't supply them — see the module doc
 * comment on `EXTENDED_PROBE_ENTRIES`.
 */
export function probeStream(file: string): StreamProbe {
  const result = runResult("ffprobe", probeStreamArgs(file));
  if (result.status !== 0) {
    throw new Error(`ffprobe failed for ${file}: ${result.stderr?.trim() || result.error?.message || "unknown error"}`);
  }
  const stream = (JSON.parse(result.stdout).streams?.[0] ?? {}) as RawFfprobeStream;
  if (
    stream.nb_read_frames === undefined ||
    stream.avg_frame_rate === undefined ||
    stream.width === undefined ||
    stream.height === undefined
  ) {
    throw new Error(`ffprobe did not return the required stream fields (nb_read_frames/avg_frame_rate/width/height) for ${file}`);
  }
  return {
    frameCount: Number(stream.nb_read_frames),
    averageFrameRate: stream.avg_frame_rate,
    width: stream.width,
    height: stream.height,
    pixelFormat: stream.pix_fmt,
    colorRange: stream.color_range,
    colorSpace: stream.color_space,
    colorTransfer: stream.color_transfer,
    colorPrimaries: stream.color_primaries,
  };
}

// ---------------------------------------------------------------------------
// decodeAllFrames — pipeline/p0/validate.ts's all-frame decode check.
// ---------------------------------------------------------------------------

export function decodeAllFramesArgs(file: string): string[] {
  return ["-v", "error", "-i", file, "-map", "0:v:0", "-f", "null", "-"];
}

/** Decodes every frame of `file` without writing output, to detect decode errors. */
export function decodeAllFrames(file: string): { ok: boolean; stderr: string } {
  const result = runResult("ffmpeg", decodeAllFramesArgs(file));
  return { ok: result.status === 0, stderr: (result.stderr ?? "").trim() };
}

// ---------------------------------------------------------------------------
// extractFrame — pipeline/p0/evaluate.ts's still extraction call site.
// ---------------------------------------------------------------------------

export function extractFrameArgs(file: string, frame: number, out: string): string[] {
  return ["-y", "-v", "error", "-i", file, "-vf", `select=eq(n\\,${frame})`, "-frames:v", "1", out];
}

/** Extracts decoded frame index `frame` (local, 0-based) from `file` into `out`. */
export function extractFrame(file: string, frame: number, out: string): void {
  run("ffmpeg", extractFrameArgs(file, frame, out), `extract frame ${frame}`);
}

// ---------------------------------------------------------------------------
// cropScale — pipeline/p0/evaluate.ts's mouth-crop call site.
// ---------------------------------------------------------------------------

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
}

export function cropScaleArgs(file: string, crop: CropRegion, out: string): string[] {
  return [
    "-y",
    "-v",
    "error",
    "-i",
    file,
    "-vf",
    `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=${crop.displayWidth}:${crop.displayHeight}`,
    out,
  ];
}

/** Crops `file` to `crop` and scales to `crop.displayWidth`x`crop.displayHeight`, writing `out`. */
export function cropScale(file: string, crop: CropRegion, out: string): void {
  run("ffmpeg", cropScaleArgs(file, crop, out), `crop/scale ${file}`);
}

// ---------------------------------------------------------------------------
// frameDifference — pipeline/p0/visual-integrity.ts's difference filter,
// used at two call sites there (raw stdout for the metric, and a rendered
// PNG for review). Both call sites share the same filter_complex expression.
// ---------------------------------------------------------------------------

/** The `blend=all_mode=difference` filter_complex graph, exactly as visual-integrity.ts builds it. */
export function differenceFilterExpr(localFrame: number): string {
  return `[0:v]select=eq(n\\,${localFrame}),setpts=PTS-STARTPTS,format=rgb24[baseline];[1:v]setpts=PTS-STARTPTS,format=rgb24[still];[baseline][still]blend=all_mode=difference,format=rgb24[diff]`;
}

/** Argv for the raw rgb24 stdout variant (visual-integrity.ts's `rawDifference`). */
export function frameDifferenceRawArgs(baseline: string, still: string, localFrame: number): string[] {
  return [
    "-v",
    "error",
    "-i",
    baseline,
    "-i",
    still,
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
}

/** Argv for the rendered-PNG variant (visual-integrity.ts's diff render for review). */
export function frameDifferenceArgs(baseline: string, still: string, localFrame: number, out: string): string[] {
  return [
    "-y",
    "-v",
    "error",
    "-i",
    baseline,
    "-i",
    still,
    "-filter_complex",
    differenceFilterExpr(localFrame),
    "-map",
    "[diff]",
    "-frames:v",
    "1",
    out,
  ];
}

/**
 * Runs the difference filter and returns raw rgb24 bytes on stdout. Bypasses
 * `run`/`runResult` (which fix `encoding: "utf8"`) and calls `spawnSync`
 * directly with `encoding: null`, exactly as `visual-integrity.ts` does,
 * because binary stdout cannot round-trip through a utf8-decoded string.
 * `dimensions` sizes `maxBuffer` (P0 uses `width * height * 3 + 1024` for
 * its fixed 1080x1920 baseline; this wrapper takes the dimensions as a
 * parameter since it is not tied to that one resolution).
 */
export function frameDifferenceRaw(
  baseline: string,
  still: string,
  localFrame: number,
  dimensions: { width: number; height: number },
): Uint8Array {
  const result = spawnSync("ffmpeg", frameDifferenceRawArgs(baseline, still, localFrame), {
    cwd: process.cwd(),
    encoding: null,
    maxBuffer: dimensions.width * dimensions.height * 3 + 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `frame difference (raw) failed for local frame ${localFrame}: ${result.stderr?.toString() || result.error?.message || "unknown error"}`,
    );
  }
  return result.stdout as Uint8Array;
}

/** Renders the difference filter's output to `out` (a PNG, typically). */
export function frameDifference(baseline: string, still: string, localFrame: number, out: string): void {
  run("ffmpeg", frameDifferenceArgs(baseline, still, localFrame, out), `frame difference (render) for local frame ${localFrame}`);
}

// ---------------------------------------------------------------------------
// encodeFromPngSequence — no P0 call site exists for this (P0 renders via
// Remotion directly and never assembles a PNG sequence with ffmpeg), so
// there is no golden test to pin it against. Provided because render
// tracks that produce PNG sequences (rasteriser-style methods) need it.
// ---------------------------------------------------------------------------

export interface EncodeFromPngSequenceOptions {
  fps: number;
  codec?: string;
  crf?: number;
  pixelFormat?: string;
  startNumber?: number;
}

export function encodeFromPngSequenceArgs(dir: string, pattern: string, out: string, opts: EncodeFromPngSequenceOptions): string[] {
  const args = ["-y", "-v", "error", "-framerate", String(opts.fps)];
  if (opts.startNumber !== undefined) args.push("-start_number", String(opts.startNumber));
  args.push(
    "-i",
    `${dir}/${pattern}`,
    "-c:v",
    opts.codec ?? "libx264",
    "-crf",
    String(opts.crf ?? 16),
    "-pix_fmt",
    opts.pixelFormat ?? "yuv420p",
    out,
  );
  return args;
}

/** Encodes a numbered PNG sequence in `dir` (matching `pattern`, e.g. `"frame-%05d.png"`) into `out`. */
export function encodeFromPngSequence(dir: string, pattern: string, out: string, opts: EncodeFromPngSequenceOptions): void {
  run("ffmpeg", encodeFromPngSequenceArgs(dir, pattern, out, opts), `encode png sequence in ${dir}`);
}

// ---------------------------------------------------------------------------
// toolVersions — matches pipeline/p0/write-manifest.ts's version() helper
// (not one of the three required golden-test call sites, but the same
// pattern; covered anyway since it's a one-line match).
// ---------------------------------------------------------------------------

export interface ToolVersions {
  ffmpeg: string;
  ffprobe: string;
}

/** First line of `ffmpeg -version` / `ffprobe -version`, for recording (never for pinning/gating). */
/**
 * The argv each version probe uses. Exposed so it can be asserted without
 * invoking the tool -- the test suite must not require ffmpeg to be installed.
 */
export function toolVersionArgv(): Record<keyof ToolVersions, { command: string; args: string[] }> {
  return {
    ffmpeg: { command: "ffmpeg", args: ["-version"] },
    ffprobe: { command: "ffprobe", args: ["-version"] },
  };
}

/**
 * First line of each tool's `-version` output.
 *
 * `invoke` is injectable so a caller can supply captured output; it defaults to
 * spawning the tool. Record the result in a manifest -- do not pin it, since
 * these versions are observed rather than contracted.
 */
export function toolVersions(invoke: (command: string, args: string[]) => string = run): ToolVersions {
  const argv = toolVersionArgv();
  return {
    ffmpeg: invoke(argv.ffmpeg.command, argv.ffmpeg.args).split(/\r?\n/, 1)[0],
    ffprobe: invoke(argv.ffprobe.command, argv.ffprobe.args).split(/\r?\n/, 1)[0],
  };
}
