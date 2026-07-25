/**
 * M3-11: Base B2 native hand/vector keyframed 2D artifact.
 *
 * B2 is NOT one of the compared mechanisms. A/C/D/E answer "which representation
 * should we adopt". B2 answers a different question: how far can a drawn 2D look
 * get in a short shot, so the others have a ceiling to be read against. Placing
 * B2 in a quality ranking beside them compares a key-drawing workflow with a
 * continuously controllable rig, which is not the same kind of thing.
 *
 * The asset is authored natively as vector key drawings plus an exposure sheet.
 * It shares no completed PNG, no topology, and no bones with any other base.
 * PROPOSED, PoC-scoped.
 */

export const B2_STATUS = "PROPOSED" as const;
export const B2_ASSET_SPACE = { width: 1280, height: 1920 } as const;
export const NATIVE_ASSET_INPUTS: readonly string[] = [];

export interface B2MechanismDeclaration {
  id: string;
  mechanismClass: string;
  role: string;
  coreComparisonMember: boolean;
  rankableAgainstCoreMechanisms: boolean;
  sequences: readonly string[];
  rationale: string;
}

/** Guards the M3-11 stop condition in code rather than in prose alone. */
export const B2_MECHANISM: B2MechanismDeclaration = {
  id: "B2",
  mechanismClass: "keyframed-vector-2d",
  role: "quality-ceiling-control",
  coreComparisonMember: false,
  rankableAgainstCoreMechanisms: false,
  sequences: ["T1", "T3", "T8"],
  rationale: "B2 records the ceiling a drawn 2D look reaches in a short shot. It is a reference for reading A/C/D/E, not a candidate ranked beside them.",
} as const;

export interface Point {
  x: number;
  y: number;
}

/**
 * A key drawing: named closed vector paths, authored per key.
 *
 * Paths are keyed by name because vector morphing needs a correspondence, and
 * the absence of a correspondence is exactly what B2's ceiling is made of.
 */
export type KeyDrawing = Record<string, Point[]>;

export const KEY_IDS = ["K-closed", "K-part", "K-open", "K-contact", "K-open-tongue"] as const;
export type KeyId = (typeof KEY_IDS)[number];

const p = (x: number, y: number): Point => ({ x, y });

const arc = (cx: number, cy: number, rx: number, ry: number, count: number): Point[] =>
  Array.from({ length: count }, (_, i) => {
    const t = (i / count) * Math.PI * 2;
    return p(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry);
  });

/**
 * The five authored key drawings.
 *
 * `K-contact` is the T3 pose: the lips meet in the middle while both corners are
 * still parted, so the aperture is two holes rather than one. It is authored as
 * two separate paths because a single closed path cannot express two holes.
 * `K-open-tongue` introduces a tongue path that no other key contains.
 */
export const KEY_DRAWINGS: Record<KeyId, KeyDrawing> = {
  "K-closed": {
    "mouth-aperture": arc(775, 641, 76, 2, 10),
    "oral-cavity": arc(775, 641, 60, 1, 10),
    "teeth-upper": arc(775, 640, 46, 1, 10),
  },
  "K-part": {
    "mouth-aperture": arc(775, 643, 78, 12, 10),
    "oral-cavity": arc(775, 645, 62, 9, 10),
    "teeth-upper": arc(775, 636, 46, 5, 10),
  },
  "K-open": {
    "mouth-aperture": arc(775, 650, 82, 34, 10),
    "oral-cavity": arc(775, 653, 66, 27, 10),
    "teeth-upper": arc(775, 630, 46, 8, 10),
  },
  "K-contact": {
    "mouth-aperture-left": arc(730, 648, 30, 14, 10),
    "mouth-aperture-right": arc(820, 648, 30, 14, 10),
    "oral-cavity-left": arc(730, 649, 22, 10, 10),
    "oral-cavity-right": arc(820, 649, 22, 10, 10),
    "teeth-upper": arc(775, 632, 46, 7, 10),
  },
  "K-open-tongue": {
    "mouth-aperture": arc(775, 652, 84, 38, 10),
    "oral-cavity": arc(775, 655, 68, 30, 10),
    "teeth-upper": arc(775, 628, 46, 9, 10),
    tongue: arc(775, 668, 44, 16, 10),
  },
};

export interface ExposureEntry {
  key: KeyId;
  startFrame: number;
  holdFrames: number;
}

/**
 * The exposure sheet for the T1 opening ramp followed by the T3 closure.
 *
 * Held in blocks the way a drawn shot is exposed. B2 is discrete in time by
 * construction; that is a property of the workflow, not a defect to be smoothed
 * away, and it is asserted rather than hidden.
 */
export const EXPOSURE: ExposureEntry[] = [
  { key: "K-closed", startFrame: 0, holdFrames: 10 },
  { key: "K-part", startFrame: 10, holdFrames: 10 },
  { key: "K-open", startFrame: 20, holdFrames: 15 },
  { key: "K-open-tongue", startFrame: 35, holdFrames: 15 },
  { key: "K-open", startFrame: 50, holdFrames: 10 },
  { key: "K-contact", startFrame: 60, holdFrames: 15 },
  { key: "K-closed", startFrame: 75, holdFrames: 10 },
];

export const EXPOSURE_END_FRAME_EXCLUSIVE = 85;
