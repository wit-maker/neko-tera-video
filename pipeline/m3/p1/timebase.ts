/**
 * Timebase conversion between P0's recording convention and P0b's contract
 * convention.
 *
 * - P0 (`pipeline/p0/contracts.ts` `BASELINE`) records an **inclusive global**
 *   range: `clipStart`/`clipEnd` are both absolute frame indices that are
 *   included in the range (e.g. `17617..18235`).
 * - P0b (`pipeline/p0b/comparison-contract.ts` `validateTimebase`) requires a
 *   **half-open local** range: `startFrame`/`endFrameExclusive`, where
 *   `endFrameExclusive` is one past the last included frame, relative to the
 *   clip's own start (e.g. `{startFrame: 0, endFrameExclusive: 619}`).
 *
 * No conversion between the two existed anywhere in the repository before
 * this module. The two shapes intentionally use different field names so a
 * value typed as one cannot be assigned where the other is required without
 * a compile error — see `timebase.test.ts` for a `@ts-expect-error` fixture
 * that pins this down.
 */

/** Inclusive-both-ends absolute frame range, as recorded by P0. */
export interface GlobalFrameRange {
  /** Absolute frame index of the first included frame (inclusive). */
  clipStart: number;
  /** Absolute frame index of the last included frame (inclusive). */
  clipEnd: number;
}

/** Half-open frame range relative to a clip's own start, as required by P0b. */
export interface LocalFrameRange {
  /** Frame index relative to the clip, first included frame (inclusive). */
  startFrame: number;
  /** Frame index relative to the clip; one past the last included frame. */
  endFrameExclusive: number;
}

function assertIntegerFrame(label: string, value: number): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer frame index; got ${JSON.stringify(value)}`);
  }
}

function assertValidGlobalRange(range: GlobalFrameRange): void {
  assertIntegerFrame("clipStart", range.clipStart);
  assertIntegerFrame("clipEnd", range.clipEnd);
  if (range.clipEnd < range.clipStart) {
    throw new Error(`Global frame range is inverted: clipEnd (${range.clipEnd}) < clipStart (${range.clipStart})`);
  }
}

function assertValidLocalRange(range: LocalFrameRange): void {
  assertIntegerFrame("startFrame", range.startFrame);
  assertIntegerFrame("endFrameExclusive", range.endFrameExclusive);
  if (range.endFrameExclusive <= range.startFrame) {
    throw new Error(
      `Local frame range has zero or negative length: [${range.startFrame}, ${range.endFrameExclusive})`,
    );
  }
}

/** Number of frames covered by an inclusive global range. Throws on an inverted or non-integer range. */
export function globalFrameCount(range: GlobalFrameRange): number {
  assertValidGlobalRange(range);
  return range.clipEnd - range.clipStart + 1;
}

/** Number of frames covered by a half-open local range. Throws on an empty/inverted or non-integer range. */
export function localFrameCount(range: LocalFrameRange): number {
  assertValidLocalRange(range);
  return range.endFrameExclusive - range.startFrame;
}

/**
 * Converts an inclusive global range to a half-open local range, relative to
 * `anchorClipStart` (the global frame that local frame 0 corresponds to).
 * Defaults `anchorClipStart` to `global.clipStart` itself, i.e. "this
 * range's own local timebase" — the reading that produces the literal case
 * from the packet: `{clipStart: 17617, clipEnd: 18235}` -> `{startFrame: 0,
 * endFrameExclusive: 619}`.
 */
export function toLocalRange(global: GlobalFrameRange, anchorClipStart: number = global.clipStart): LocalFrameRange {
  assertValidGlobalRange(global);
  assertIntegerFrame("anchorClipStart", anchorClipStart);
  const local: LocalFrameRange = {
    startFrame: global.clipStart - anchorClipStart,
    endFrameExclusive: global.clipEnd - anchorClipStart + 1,
  };
  assertValidLocalRange(local);
  return local;
}

/**
 * Converts a half-open local range back to an inclusive global range, given
 * `anchorClipStart` (the global frame that local frame 0 corresponds to).
 * Inverse of `toLocalRange` when called with the same anchor.
 */
export function toGlobalRange(local: LocalFrameRange, anchorClipStart: number): GlobalFrameRange {
  assertValidLocalRange(local);
  assertIntegerFrame("anchorClipStart", anchorClipStart);
  const global: GlobalFrameRange = {
    clipStart: anchorClipStart + local.startFrame,
    clipEnd: anchorClipStart + local.endFrameExclusive - 1,
  };
  assertValidGlobalRange(global);
  return global;
}

/** Whether `frame` (an absolute frame index) falls inside the inclusive global range. */
export function containsGlobalFrame(range: GlobalFrameRange, frame: number): boolean {
  assertValidGlobalRange(range);
  return frame >= range.clipStart && frame <= range.clipEnd;
}

/**
 * Whether `frame` (relative to the clip) falls inside the half-open local
 * range. `range.endFrameExclusive` itself is never contained — this is the
 * boundary the packet requires an explicit test for.
 */
export function containsLocalFrame(range: LocalFrameRange, frame: number): boolean {
  assertValidLocalRange(range);
  return frame >= range.startFrame && frame < range.endFrameExclusive;
}
