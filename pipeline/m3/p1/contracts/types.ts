/**
 * p1-i3: shared type surface + shared comparison values for the four core P1
 * render methods' (A/C/D/E) contracts.
 *
 * This module defines the shape AND the concrete comparison-relevant values
 * every leaf (`a.ts`/`c.ts`/`d.ts`/`e.ts`) reuses by reference, rather than
 * retyping the same numbers four times. Retyping invites drift that a byte-
 * equality test would only catch after the fact; importing the same object
 * makes drift structurally impossible for anything that imports it honestly.
 *
 * Reuses `SequenceId`/`SEQUENCE_IDS` from `sequence.ts` (p1-i1) and
 * `LocalFrameRange` from `timebase.ts` (p1-i2) rather than redefining them.
 * `stills` and the frame-count-derived `timebase` are read from
 * `p1-sequences.json` (p1-i1), not hardcoded here, because the total frame
 * count is provisional pending p1-d0 decision (2) -- see `SEQUENCE_FILE`.
 *
 * ---------------------------------------------------------------------
 * Typed holes
 * ---------------------------------------------------------------------
 * Method-specific fields (`renderer`, `camera.projection`, `debugPass`) are
 * typed `T | undefined` and left `undefined` in every leaf. Under this repo's
 * `strict: true` tsconfig (strictNullChecks on), reading a property off a
 * value typed `T | undefined` without narrowing is a compile error. So a
 * render packet that reaches straight for `A_CONTRACT.renderer.name` without
 * having replaced the `undefined` gets a `tsc` failure pointing at exactly
 * that line, not a silent `undefined` discovered later at runtime.
 *
 * This is bypassable with `!` or `as` -- no feature of TypeScript's type
 * system can prevent a caller from lying to the compiler -- so it is a
 * best-effort compile-time guard, not a proof. `index.ts` additionally
 * exports `assertLeafFilled`, a runtime check a render packet should call
 * once it believes its leaf is complete, as a second, unbypassable line of
 * defense.
 */

import { SEQUENCE_IDS, type SequenceId } from "../sequence";
import type { LocalFrameRange } from "../timebase";
import sequenceFileJson from "../p1-sequences.json";

// ---------------------------------------------------------------------------
// Bases
// ---------------------------------------------------------------------------

/** The four core P1 render methods this contract governs. B1/B2 are out of scope (separate cards). */
export const BASES = ["A", "C", "D", "E"] as const;
export type Base = (typeof BASES)[number];

// ---------------------------------------------------------------------------
// Field shapes
// ---------------------------------------------------------------------------

export type AlphaHandling = "opaque" | "straight" | "premultiplied";
export type CameraAuthoredIn = "asset" | "comparison";

export interface RasterSpec {
  width: number;
  height: number;
  pixelFormat: string;
  primaries: string;
  transfer: string;
  matrix: string;
  range: string;
}

export interface FramingLandmark {
  id: string;
  x: number;
  y: number;
}

export interface FramingSpec {
  landmarks: FramingLandmark[];
  tolerancePx: number;
}

export interface CropSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
}

export interface CameraSpec {
  /** Method-specific hole. `undefined` until the owning render packet fills it in. */
  projection: string | undefined;
  /** Shared: the ADR-001 / GOV-013 adopted comparison range. Same value for every method. */
  yawLimitDegrees: number;
  pitchLimitDegrees: number;
  /**
   * Fixed by THIS contract, not a hole: only E (M3-08) authored its own
   * camera. A/C/D are given a comparison camera at render time.
   */
  authoredIn: CameraAuthoredIn;
}

export interface RendererSpec {
  name: string;
  version: string;
  executablePath: string;
  antiAliasing: string;
  samples: number;
  seed: number;
}

export interface DebugPassSpec {
  mechanism: string;
  contents: string[];
}

export interface Timebase extends LocalFrameRange {
  fps: number;
}

export const PRESENTATION_ORDER = ["normal", "slow", "crop", "debug", "still"] as const;
export type PresentationOrder = typeof PRESENTATION_ORDER;

export interface P1MethodContract {
  base: Base;
  sequenceIds: readonly SequenceId[];
  timebase: Timebase;
  raster: RasterSpec;
  alpha: AlphaHandling;
  framing: FramingSpec;
  camera: CameraSpec;
  crop: CropSpec;
  stills: number[];
  presentation: PresentationOrder;
  /** Method-specific hole. `undefined` until the owning render packet fills it in. */
  renderer: RendererSpec | undefined;
  /** Method-specific hole. `undefined` until the owning render packet fills it in. */
  debugPass: DebugPassSpec | undefined;
}

/**
 * Fields the cross-base invariant checker (`index.ts`) requires to be
 * byte-identical across all four core leaves. This is the packet's
 * headline list; `index.ts` additionally checks `sequenceIds` as a bonus
 * (declared shared in the packet's design table, though not part of this
 * named list).
 */
export const CROSS_BASE_INVARIANT_FIELDS = ["raster", "crop", "stills", "timebase", "framing", "presentation"] as const;
export type CrossBaseInvariantField = (typeof CROSS_BASE_INVARIANT_FIELDS)[number];

// ---------------------------------------------------------------------------
// Shared comparison-relevant values, read from p1-i1/p1-i2, not hardcoded
// ---------------------------------------------------------------------------

interface SequenceFileShape {
  status: "PROVISIONAL_TOTAL_FRAME_COUNT" | "OWNER_DECIDED_TOTAL_FRAME_COUNT";
  provisionalNote: string;
  fps: number;
  startFrame: number;
  endFrameExclusive: number;
  stillFrame: { frame: number; sequenceId: string };
}

/** The p1-i1 sequence file, re-exported so a leaf/test can inspect its provisional status without re-parsing the JSON. */
export const SEQUENCE_FILE = sequenceFileJson as unknown as SequenceFileShape;

/**
 * Total-frame-count status is PROVISIONAL pending p1-d0 decision (2) (each
 * test's length, hence the total frame count). This contract proceeds on
 * whatever `p1-sequences.json` currently declares -- 619 frames as of this
 * writing -- and is READ here, not restated as a literal, so a future change
 * to decision (2) only requires updating `p1-sequences.json`.
 */
export const SHARED_TIMEBASE: Timebase = {
  fps: SEQUENCE_FILE.fps,
  startFrame: SEQUENCE_FILE.startFrame,
  endFrameExclusive: SEQUENCE_FILE.endFrameExclusive,
};

/** p1-i1 declares exactly one shared still frame. Read, not copied. */
export const SHARED_STILLS: number[] = [SEQUENCE_FILE.stillFrame.frame];

/** The core-4 sequence set, from p1-i1's `sequence.ts` -- not restated as a literal array. */
export const SHARED_SEQUENCE_IDS: readonly SequenceId[] = SEQUENCE_IDS;

/**
 * Shared output raster. 1280x1920 reuses Base C's already-authored native
 * asset space (`pipeline/m3/c/asset.ts`'s `C_ASSET_SPACE`), which was itself
 * chosen to stay proportionate to the sensei source-material raster. Using
 * an already-grounded space avoids inventing a seventh coordinate system;
 * see the PR body for the full landmark rationale.
 */
export const SHARED_RASTER: RasterSpec = {
  width: 1280,
  height: 1920,
  pixelFormat: "yuv420p",
  primaries: "bt709",
  transfer: "bt709",
  matrix: "bt709",
  range: "tv",
};

/**
 * Framing landmarks: decision (6) requires eye/nose/mouth-corner positions
 * fixed as a shared contract so all four methods place the head identically.
 * Coordinates are C's own already-authored control-point positions
 * (`pipeline/m3/c/asset.ts`): the two eye ellipse centers, the nose cage's
 * centroid, and the two tagged mouth-corner cage points
 * (`lip-corner-left`/`lip-corner-right`). These are not arbitrary: they are
 * the one method (C) that already has concrete, authored coordinates in this
 * shared raster, so anchoring the contract to them means D/E/A converge on a
 * real point instead of a number invented for this packet.
 */
export const SHARED_FRAMING: FramingSpec = {
  landmarks: [
    { id: "eyeLeft", x: 645, y: 505 },
    { id: "eyeRight", x: 825, y: 500 },
    { id: "noseTip", x: 790, y: 574 },
    { id: "mouthCornerLeft", x: 700, y: 642 },
    { id: "mouthCornerRight", x: 852, y: 638 },
  ],
  tolerancePx: 4,
};

/**
 * Shared mouth/jaw/muzzle comparison crop, generalising `pipeline/p0/contracts.ts`'s
 * `BASELINE.crop` to the P1 shared raster. Centered on the midpoint of
 * `mouthCornerLeft`/`mouthCornerRight` (776, 640), sized 320x320 (same
 * magnitude as `BASELINE.crop`) so the box comfortably contains the mouth,
 * jaw, and muzzle-pad region with margin on every side, displayed at 2x
 * (640x640) for close inspection -- the same up-scale BASELINE used.
 */
export const SHARED_CROP: CropSpec = {
  x: 616,
  y: 480,
  width: 320,
  height: 320,
  displayWidth: 640,
  displayHeight: 640,
};
