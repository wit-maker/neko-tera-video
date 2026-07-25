/**
 * M3-04: Base C native asset — continuous 2D parametric (layers, mesh control
 * cage, deformers, masks, draw order).
 *
 * The asset is authored natively for C. It consumes no completed PNG, no shared
 * topology, and no shared bones; `NATIVE_ASSET_INPUTS` below is the whole input
 * set. The A mouth patches under `public/assets/cutout/` are visual reference
 * for the Character Bible only and are never read by this asset.
 *
 * Coordinate space is the sensei source-material raster (1280x1920) so that
 * landmarks stay comparable with the P0a baseline without sharing a deliverable.
 * PROPOSED, PoC-scoped: not an adopted architecture and not a public API.
 */

export const C_ASSET_STATUS = "PROPOSED" as const;
export const C_ASSET_SPACE = { width: 1280, height: 1920 } as const;
/** Every external input this asset reads. Empty of rasters by construction. */
export const NATIVE_ASSET_INPUTS: readonly string[] = [];

export interface Point {
  x: number;
  y: number;
}

export const LAYER_IDS = [
  "ear-far", "head-ruff", "head-base", "fur-markings", "cheek-far",
  "oral-cavity", "tongue", "teeth-lower", "teeth-upper",
  "jaw", "muzzle-pads", "lip-line", "nose", "cheek-near",
  "eye-far", "eye-near", "brow-far", "brow-near",
  "glasses", "whiskers-far", "whiskers-near", "ear-near",
] as const;
export type LayerId = (typeof LAYER_IDS)[number];

/** Control points that deformers address by name rather than by index. */
export const POINT_TAGS = [
  "lip-corner-left", "lip-corner-right", "lip-upper-mid", "lip-lower-mid",
  "jaw-pivot", "muzzle-outer-left", "muzzle-outer-right", "chin-tip",
] as const;
export type PointTag = (typeof POINT_TAGS)[number];

export interface Layer {
  id: LayerId;
  /** Back-to-front paint index; unique and strictly increasing across layers. */
  drawOrder: number;
  /** Parallax depth in asset units. Larger is nearer the viewer. */
  depth: number;
  /** Closed control cage. C deforms this cage; it is not a bone hierarchy. */
  cage: Point[];
  /** Named cage indices addressed by deformers. */
  tags?: Partial<Record<PointTag, number>>;
  /** Layer whose deformed cage clips this one. Gives real occlusion. */
  clipBy?: LayerId;
  fill: string;
}

const p = (x: number, y: number): Point => ({ x, y });

/**
 * Builds an ellipse control cage. C's cage is a mesh input, not a final
 * outline; the renderer interpolates it, so 12 points carry enough curvature
 * for the muzzle region without becoming a hand-authored key drawing.
 */
const ellipse = (cx: number, cy: number, rx: number, ry: number, count = 12, phase = 0): Point[] =>
  Array.from({ length: count }, (_, i) => {
    const t = phase + (i / count) * Math.PI * 2;
    return p(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry);
  });

/**
 * The mouth aperture cage at rest, i.e. closed: index 0 and 6 are the corners
 * and the two arcs between them are nearly coincident, so the rest cage encloses
 * almost no area and the oral cavity behind it is masked away. `jawOpen` parts
 * the arcs; it does not swap in an opened drawing.
 *
 * Indices 1-5 are the upper arc left to right, 7-11 the lower arc right to left.
 */
export const APERTURE_UPPER_ARC = [1, 2, 3, 4, 5] as const;
export const APERTURE_LOWER_ARC = [7, 8, 9, 10, 11] as const;

const APERTURE_CAGE: Point[] = [
  p(700, 642), p(726, 640), p(752, 638), p(775, 637), p(800, 638), p(826, 639),
  p(852, 638), p(826, 640), p(800, 639), p(775, 638), p(752, 639), p(726, 641),
];

const APERTURE_TAGS: Partial<Record<PointTag, number>> = {
  "lip-corner-left": 0,
  "lip-corner-right": 6,
  "lip-upper-mid": 3,
  "lip-lower-mid": 9,
};

/**
 * Base C native asset in rest pose. Draw order is explicit and total: the oral
 * cavity, tongue, and teeth sit behind the jaw, muzzle pads, and lip line, so
 * closing the aperture hides them structurally instead of by redrawing.
 */
export const C_NATIVE_ASSET: Layer[] = [
  { id: "ear-far", drawOrder: 0, depth: -40, cage: [p(300, 300), p(312, 152), p(430, 268), p(408, 330)], fill: "#cfc7bd" },
  { id: "head-ruff", drawOrder: 1, depth: -30, cage: ellipse(660, 470, 470, 320, 16), fill: "#e8e2d8" },
  { id: "head-base", drawOrder: 2, depth: -10, cage: ellipse(700, 470, 330, 260, 16), fill: "#f2ece2" },
  { id: "fur-markings", drawOrder: 3, depth: -6, cage: ellipse(690, 330, 190, 90, 12), clipBy: "head-base", fill: "#c9bfb2" },
  { id: "cheek-far", drawOrder: 4, depth: -4, cage: ellipse(560, 600, 130, 96, 12), clipBy: "head-base", fill: "#ece5da" },

  // The oral interior straddles the closed lip line. Nothing repositions it when
  // the mouth shuts; the aperture simply encloses no area, so the mask removes it.
  { id: "oral-cavity", drawOrder: 5, depth: 0, cage: ellipse(775, 644, 92, 40, 12), clipBy: "lip-line", fill: "#43242a" },
  { id: "tongue", drawOrder: 6, depth: 2, cage: ellipse(775, 652, 58, 24, 12), clipBy: "lip-line", fill: "#b5747a" },
  { id: "teeth-lower", drawOrder: 7, depth: 3, cage: [p(726, 644), p(824, 644), p(824, 654), p(726, 654)], clipBy: "lip-line", fill: "#f6f2ea" },
  { id: "teeth-upper", drawOrder: 8, depth: 4, cage: [p(726, 630), p(824, 630), p(824, 644), p(726, 644)], clipBy: "lip-line", fill: "#fbf8f2" },

  {
    id: "jaw", drawOrder: 9, depth: 6,
    cage: [p(690, 636), p(775, 640), p(860, 636), p(846, 700), p(775, 726), p(704, 700)],
    tags: { "jaw-pivot": 0, "chin-tip": 4 }, fill: "#f4eee5",
  },
  {
    id: "muzzle-pads", drawOrder: 10, depth: 8,
    cage: ellipse(775, 616, 128, 74, 12),
    tags: { "muzzle-outer-left": 6, "muzzle-outer-right": 0 }, fill: "#faf6ef",
  },
  { id: "lip-line", drawOrder: 11, depth: 9, cage: APERTURE_CAGE, tags: APERTURE_TAGS, fill: "none" },
  { id: "nose", drawOrder: 12, depth: 10, cage: [p(790, 556), p(816, 574), p(790, 592), p(764, 574)], fill: "#b79a92" },
  { id: "cheek-near", drawOrder: 13, depth: 12, cage: ellipse(920, 596, 120, 92, 12), clipBy: "head-base", fill: "#efe8dd" },

  { id: "eye-far", drawOrder: 14, depth: 14, cage: ellipse(645, 505, 46, 26, 12), fill: "#8a6a44" },
  { id: "eye-near", drawOrder: 15, depth: 16, cage: ellipse(825, 500, 46, 26, 12), fill: "#8a6a44" },
  { id: "brow-far", drawOrder: 16, depth: 15, cage: [p(602, 462), p(690, 452), p(690, 464), p(602, 474)], fill: "#b9ae9e" },
  { id: "brow-near", drawOrder: 17, depth: 17, cage: [p(782, 452), p(870, 462), p(870, 474), p(782, 464)], fill: "#b9ae9e" },

  { id: "glasses", drawOrder: 18, depth: 20, cage: [p(566, 505), p(724, 500), p(746, 500), p(904, 496), p(904, 520), p(566, 528)], fill: "none" },
  { id: "whiskers-far", drawOrder: 19, depth: 18, cage: [p(660, 600), p(430, 560), p(430, 572), p(660, 616)], fill: "none" },
  { id: "whiskers-near", drawOrder: 20, depth: 22, cage: [p(890, 596), p(1120, 556), p(1120, 568), p(890, 612)], fill: "none" },
  { id: "ear-near", drawOrder: 21, depth: 24, cage: [p(786, 288), p(858, 140), p(884, 300), p(820, 322)], fill: "#ded6ca" },
];

export const layerById = (asset: readonly Layer[], id: LayerId): Layer | undefined =>
  asset.find((layer) => layer.id === id);

/** Shoelace area of a closed cage. Used to measure aperture and occlusion. */
export const cageArea = (cage: readonly Point[]): number => {
  let sum = 0;
  for (let i = 0; i < cage.length; i += 1) {
    const a = cage[i];
    const b = cage[(i + 1) % cage.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
};
