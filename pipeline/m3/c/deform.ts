/**
 * M3-04: Base C native controls and deformer evaluation.
 *
 * Every control is continuous. C has no viseme enum and no state table: the
 * same code path produces any point between rest and full open, which is the
 * property P1 is meant to expose against A's discrete patch selection.
 *
 * Deformer order is fixed and documented because it is part of the asset, not
 * an implementation detail: jaw rotation, aperture shaping, muzzle mesh,
 * cheek, eyelid, view parallax, breath.
 */

import { APERTURE_LOWER_ARC, APERTURE_UPPER_ARC, C_NATIVE_ASSET, cageArea, layerById, type Layer, type LayerId, type Point } from "./asset";

/** Adopted comparison range, ADR-001 / GOV-013. Not a production camera range. */
export const VIEW_LIMITS = { yawDegrees: 15, pitchDegrees: 10 } as const;
/** Asset units of lateral travel per depth unit at 45 degrees. C-native tuning. */
const PARALLAX_GAIN = 4;
/** Asset units the lower jaw travels at full open, at the centre of the mouth. */
const JAW_TRAVEL = 40;
/** Asset units the upper lip lifts at full open. */
const UPPER_LIP_LIFT = 22;
/** Rest-pose x of the two mouth corners; the jaw field is pinned to zero there. */
const CORNER_X = { left: 700, right: 852 } as const;

export interface CNativeControls {
  /** Continuous mouth opening. Drives jaw rotation and aperture height. */
  jawOpen: number;
  /** Positive spreads the corners, negative rounds them. */
  lipCornerPull: number;
  /** Independent left/right offset applied on top of `lipCornerPull`. */
  lipCornerAsymmetry: number;
  /** Muzzle mesh lattice: horizontal compression with vertical compensation. */
  muzzleRound: number;
  cheekPuff: number;
  tongueRaise: number;
  yawDegrees: number;
  pitchDegrees: number;
  breath: number;
  blink: number;
}

export const REST_CONTROLS: CNativeControls = {
  jawOpen: 0, lipCornerPull: 0, lipCornerAsymmetry: 0, muzzleRound: 0,
  cheekPuff: 0, tongueRaise: 0, yawDegrees: 0, pitchDegrees: 0, breath: 0, blink: 0,
};

export const controls = (overrides: Partial<CNativeControls> = {}): CNativeControls => ({ ...REST_CONTROLS, ...overrides });

/** Returns every range violation. Out-of-range controls are rejected, not clamped. */
export function validateControls(value: CNativeControls): string[] {
  const errors: string[] = [];
  const unit = (name: keyof CNativeControls, min: number) => {
    const v = value[name];
    if (!Number.isFinite(v) || v < min || v > 1) errors.push(`${name} must be within [${min}, 1]`);
  };
  unit("jawOpen", 0); unit("muzzleRound", 0); unit("cheekPuff", 0); unit("tongueRaise", 0);
  unit("breath", 0); unit("blink", 0); unit("lipCornerPull", -1); unit("lipCornerAsymmetry", -1);
  if (!Number.isFinite(value.yawDegrees) || Math.abs(value.yawDegrees) > VIEW_LIMITS.yawDegrees) errors.push("yawDegrees must be within the adopted +/-15 comparison range");
  if (!Number.isFinite(value.pitchDegrees) || Math.abs(value.pitchDegrees) > VIEW_LIMITS.pitchDegrees) errors.push("pitchDegrees must be within the adopted +/-10 comparison range");
  return errors;
}

export interface DeformedLayer extends Omit<Layer, "cage"> {
  cage: Point[];
}

const rad = (degrees: number) => (degrees * Math.PI) / 180;
const centroid = (cage: readonly Point[]): Point => ({
  x: cage.reduce((sum, q) => sum + q.x, 0) / cage.length,
  y: cage.reduce((sum, q) => sum + q.y, 0) / cage.length,
});

const scaleAbout = (cage: readonly Point[], about: Point, sx: number, sy: number): Point[] =>
  cage.map((q) => ({ x: about.x + (q.x - about.x) * sx, y: about.y + (q.y - about.y) * sy }));

const translate = (cage: readonly Point[], dx: number, dy: number): Point[] =>
  cage.map((q) => ({ x: q.x + dx, y: q.y + dy }));

/**
 * The jaw displacement field. One continuous function drives the aperture's
 * lower arc and everything parented to the lower jaw, so the mask and the
 * layers it masks can never disagree — the defect that a separate lower-arc
 * offset and a separately pivoted dentition produced.
 *
 * It is pinned to zero at both corners, so the mouth hinges without a bone.
 */
const jawDrop = (x: number, jawOpen: number): number => {
  const t = Math.min(1, Math.max(0, (x - CORNER_X.left) / (CORNER_X.right - CORNER_X.left)));
  return jawOpen * JAW_TRAVEL * Math.sin(Math.PI * t);
};

/** Share of the jaw field each layer receives. Absent means skull-parented. */
const JAW_FOLLOW: Partial<Record<LayerId, number | "muzzle">> = {
  jaw: 1, "teeth-lower": 0.75, tongue: 0.85, "oral-cavity": 0.5, "muzzle-pads": "muzzle",
};

/**
 * Evaluates the native controls into deformed cages.
 *
 * Throws on an out-of-range control rather than clamping, so an invalid P1 run
 * fails loudly instead of silently producing a comparable-looking artifact.
 */
export function evaluate(value: CNativeControls, asset: readonly Layer[] = C_NATIVE_ASSET): DeformedLayer[] {
  const errors = validateControls(value);
  if (errors.length > 0) throw new Error(`invalid C native controls: ${errors.join("; ")}`);

  const yaw = Math.tan(rad(value.yawDegrees)) * PARALLAX_GAIN;
  const pitch = Math.tan(rad(value.pitchDegrees)) * PARALLAX_GAIN;
  const upperLift = (x: number) => (value.jawOpen === 0 ? 0 : (jawDrop(x, 1) / JAW_TRAVEL) * UPPER_LIP_LIFT * value.jawOpen);

  return asset.map((layer) => {
    let cage: Point[] = layer.cage.map((q) => ({ ...q }));

    // 1. Jaw field. Skull-parented layers receive none of it.
    const follow = JAW_FOLLOW[layer.id];
    if (follow !== undefined && value.jawOpen !== 0) {
      // The whisker pads only carry the field below the muzzle mid-line.
      const share = (q: Point) => (follow === "muzzle" ? Math.min(1, Math.max(0, (q.y - 600) / 40)) : follow);
      cage = cage.map((q) => ({ x: q.x, y: q.y + jawDrop(q.x, value.jawOpen) * share(q) }));
    }

    // 2. Aperture shaping. The arcs part continuously; nothing is swapped in.
    if (layer.id === "lip-line" && layer.tags) {
      const t = layer.tags;
      const left = t["lip-corner-left"];
      const right = t["lip-corner-right"];
      if (left === undefined || right === undefined) throw new Error("lip-line is missing a tagged corner");
      for (const i of APERTURE_UPPER_ARC) cage[i] = { ...cage[i], y: cage[i].y - upperLift(cage[i].x) };
      for (const i of APERTURE_LOWER_ARC) cage[i] = { ...cage[i], y: cage[i].y + jawDrop(cage[i].x, value.jawOpen) };
      // Spread and round scale the whole aperture about its centre. Moving only
      // the corners let them travel past their neighbouring arc points and the
      // outline crossed itself below jawOpen 0.2 at pull -0.8 or tighter.
      const midX = (cage[left].x + cage[right].x) / 2;
      const widthScale = 1 + value.lipCornerPull * 0.14;
      const asym = value.lipCornerAsymmetry * 12;
      for (let i = 0; i < cage.length; i += 1) cage[i] = { ...cage[i], x: midX + (cage[i].x - midX) * widthScale - asym };
      cage[left] = { ...cage[left], y: cage[left].y - value.lipCornerPull * 4 };
      cage[right] = { ...cage[right], y: cage[right].y - value.lipCornerPull * 4 };
    }

    // 3. Muzzle mesh lattice. Rounding narrows and heightens the whisker pads.
    if (layer.id === "muzzle-pads" && value.muzzleRound !== 0) {
      cage = scaleAbout(cage, centroid(cage), 1 - value.muzzleRound * 0.18, 1 + value.muzzleRound * 0.12);
    }

    // 4. Cheek volume.
    if ((layer.id === "cheek-near" || layer.id === "cheek-far") && value.cheekPuff !== 0) {
      cage = scaleAbout(cage, centroid(cage), 1 + value.cheekPuff * 0.14, 1 + value.cheekPuff * 0.1);
    }

    // 5. Tongue.
    if (layer.id === "tongue" && value.tongueRaise !== 0) cage = translate(cage, 0, -value.tongueRaise * 18);

    // 6. Eyelid close.
    if ((layer.id === "eye-near" || layer.id === "eye-far") && value.blink !== 0) {
      cage = scaleAbout(cage, centroid(cage), 1, Math.max(0, 1 - value.blink));
    }

    // 7. View parallax by depth, then breath about the head base.
    if (yaw !== 0 || pitch !== 0) cage = translate(cage, layer.depth * yaw, layer.depth * pitch);
    if (value.breath !== 0) cage = scaleAbout(cage, { x: 700, y: 760 }, 1, 1 + value.breath * 0.012);

    return { ...layer, cage };
  });
}

/**
 * Sutherland-Hodgman clip. `clip` must be convex; the aperture cage is.
 *
 * A degenerate clip is rejected up front: with collinear clip edges every
 * half-plane test passes and the subject would be returned whole, which would
 * report a shut mouth as fully revealing its interior.
 */
export function clipPolygon(subject: readonly Point[], clip: readonly Point[]): Point[] {
  if (clip.length < 3 || cageArea(clip) < 1e-9) return [];
  let output: Point[] = subject.map((q) => ({ ...q }));
  for (let i = 0; i < clip.length && output.length > 0; i += 1) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const inside = (q: Point) => (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x) >= 0;
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j += 1) {
      const current = input[j];
      const previous = input[(j + input.length - 1) % input.length];
      const currentInside = inside(current);
      if (currentInside !== inside(previous)) {
        const d1 = (b.x - a.x) * (previous.y - a.y) - (b.y - a.y) * (previous.x - a.x);
        const d2 = (b.x - a.x) * (current.y - a.y) - (b.y - a.y) * (current.x - a.x);
        const t = d1 / (d1 - d2);
        output.push({ x: previous.x + (current.x - previous.x) * t, y: previous.y + (current.y - previous.y) * t });
      }
      if (currentInside) output.push(current);
    }
  }
  return output;
}

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** True when every turn has the same sign; what Sutherland-Hodgman needs of a clip. */
export function isConvex(poly: readonly Point[]): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const turn = cross(poly[i], poly[(i + 1) % poly.length], poly[(i + 2) % poly.length]);
    if (Math.abs(turn) < 1e-9) continue;
    if (sign === 0) sign = Math.sign(turn);
    else if (Math.sign(turn) !== sign) return false;
  }
  return true;
}

const pointInTriangle = (q: Point, a: Point, b: Point, c: Point): boolean => {
  const d1 = cross(a, b, q);
  const d2 = cross(b, c, q);
  const d3 = cross(c, a, q);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};

/**
 * Ear-clipping triangulation of a simple polygon.
 *
 * The aperture is NOT convex across the control range -- corner rounding and
 * asymmetry both bend it -- so it cannot be handed to Sutherland-Hodgman whole.
 * Triangles partition it exactly, and each is convex, so clipping against each
 * and summing gives the true intersection area.
 */
export function triangulate(poly: readonly Point[]): Point[][] {
  const vertices = orientCounterClockwise(poly).map((q) => ({ ...q }));
  const triangles: Point[][] = [];
  let guard = vertices.length * vertices.length + 16;
  while (vertices.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let i = 0; i < vertices.length; i += 1) {
      const prev = vertices[(i + vertices.length - 1) % vertices.length];
      const current = vertices[i];
      const next = vertices[(i + 1) % vertices.length];
      if (cross(prev, current, next) <= 0) continue; // reflex or collinear
      const contains = vertices.some((q, index) => {
        if (index === i || q === prev || q === next) return false;
        return pointInTriangle(q, prev, current, next);
      });
      if (contains) continue;
      triangles.push([prev, current, next]);
      vertices.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break; // degenerate or self-intersecting; fall through
  }
  if (vertices.length === 3) triangles.push([...vertices]);
  return triangles;
}

function orientCounterClockwise(cage: readonly Point[]): Point[] {
  let sum = 0;
  for (let i = 0; i < cage.length; i += 1) {
    const a = cage[i];
    const b = cage[(i + 1) % cage.length];
    sum += (b.x - a.x) * (b.y + a.y);
  }
  return sum > 0 ? [...cage].reverse() : [...cage];
}

export const apertureOf = (deformed: readonly DeformedLayer[]): Point[] => {
  const lip = deformed.find((layer) => layer.id === "lip-line");
  if (!lip) throw new Error("deformed asset has no lip-line aperture");
  return lip.cage;
};

/**
 * Area of a subject inside a mask, for shapes of any convexity.
 *
 * Both sides are triangulated. Sutherland-Hodgman is exact only for a convex
 * clip carrying a convex subject, and neither holds here: the aperture bends
 * under corner rounding and asymmetry, and the oral cavity bends under the jaw
 * field, which is x-dependent. Measured against an independent grid-sampled
 * intersection, clipping the shapes whole was short by up to 47%. Triangles
 * partition each shape exactly, so summing over every convex pair is correct.
 * Generalised as AP-012.
 */
export function intersectionArea(subject: readonly Point[], mask: readonly Point[]): number {
  if (subject.length < 3 || mask.length < 3 || cageArea(mask) < 1e-9) return 0;
  const maskTriangles = triangulate(mask);
  return triangulate(subject).reduce(
    (total, subjectTriangle) =>
      total + maskTriangles.reduce((sum, maskTriangle) => sum + cageArea(clipPolygon(subjectTriangle, maskTriangle)), 0),
    0,
  );
}

/** Area of a layer that survives its own mask. Zero means fully occluded. */
export function visibleArea(deformed: readonly DeformedLayer[], id: LayerId): number {
  const layer = deformed.find((entry) => entry.id === id);
  if (!layer) throw new Error(`deformed asset has no layer ${id}`);
  if (!layer.clipBy) return cageArea(layer.cage);
  const mask = deformed.find((entry) => entry.id === layer.clipBy);
  if (!mask) throw new Error(`layer ${id} references missing mask ${layer.clipBy}`);
  return intersectionArea(layer.cage, mask.cage);
}

export const apertureArea = (value: CNativeControls): number => cageArea(apertureOf(evaluate(value)));

export { C_NATIVE_ASSET, layerById };
