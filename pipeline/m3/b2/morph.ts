/**
 * M3-11: B2 vector morph and exposure sampling.
 *
 * Two key drawings can be inbetweened only when a point-for-point
 * correspondence exists. Where it does not, the drawn workflow's answer is to
 * cut, not to interpolate. This module classifies each transition and refuses to
 * interpolate across the ones that cannot be interpolated, so the ceiling shows
 * up in the artifact instead of being smoothed over by the tooling.
 */

import { EXPOSURE, EXPOSURE_END_FRAME_EXCLUSIVE, KEY_DRAWINGS, type ExposureEntry, type KeyDrawing, type KeyId, type Point } from "./keys";

export type TransitionKind = "morph" | "hold-cut";

export interface Transition {
  from: KeyId;
  to: KeyId;
  kind: TransitionKind;
  /** Present when the transition cannot be inbetweened. */
  reason?: string;
}

/**
 * Classifies a transition. A morph needs the same path names on both sides and
 * the same point count on each, which is the correspondence a vector inbetween
 * is built from.
 */
export function classifyTransition(from: KeyId, to: KeyId): Transition {
  return { from, to, ...classifyDrawings(KEY_DRAWINGS[from], KEY_DRAWINGS[to]) };
}

/** The correspondence rule itself, over two drawings rather than two key ids. */
export function classifyDrawings(a: KeyDrawing, b: KeyDrawing): { kind: TransitionKind; reason?: string } {
  const namesA = Object.keys(a).sort();
  const namesB = Object.keys(b).sort();
  const onlyA = namesA.filter((name) => !namesB.includes(name));
  const onlyB = namesB.filter((name) => !namesA.includes(name));
  if (onlyA.length > 0 || onlyB.length > 0) {
    const changed = [...onlyA.map((n) => `-${n}`), ...onlyB.map((n) => `+${n}`)].join(", ");
    return { kind: "hold-cut", reason: `path set changes (${changed}); no correspondence exists to inbetween` };
  }
  const mismatched = namesA.filter((name) => a[name].length !== b[name].length);
  if (mismatched.length > 0) {
    return { kind: "hold-cut", reason: `point count differs on ${mismatched.join(", ")}; no correspondence exists to inbetween` };
  }
  return { kind: "morph" };
}

export const TRANSITIONS: Transition[] = EXPOSURE.slice(0, -1).map((entry, index) => classifyTransition(entry.key, EXPOSURE[index + 1].key));

/** Linear vector inbetween. Only ever called for a classified `morph`. */
export function morph(from: KeyDrawing, to: KeyDrawing, t: number): KeyDrawing {
  const out: KeyDrawing = {};
  for (const name of Object.keys(from)) {
    const a = from[name];
    const b = to[name];
    out[name] = a.map((q: Point, i: number) => ({ x: q.x + (b[i].x - q.x) * t, y: q.y + (b[i].y - q.y) * t }));
  }
  return out;
}

export interface Sample {
  frame: number;
  entry: ExposureEntry;
  drawing: KeyDrawing;
  /** How the frame was produced: a held drawing, an inbetween, or a hard cut. */
  production: "held" | "inbetween" | "cut";
}

const entryAt = (frame: number): ExposureEntry => {
  const found = EXPOSURE.find((entry) => frame >= entry.startFrame && frame < entry.startFrame + entry.holdFrames);
  if (!found) throw new Error(`frame ${frame} falls outside the B2 exposure sheet`);
  return found;
};

/**
 * Samples the exposure sheet.
 *
 * Within a block that morphs into the next key, frames are inbetweens. Within a
 * block whose next transition cannot be inbetweened, every frame holds the key
 * and the change lands as a single cut at the block boundary.
 */
export function sampleAt(frame: number): Sample {
  if (!Number.isInteger(frame) || frame < 0 || frame >= EXPOSURE_END_FRAME_EXCLUSIVE) {
    throw new Error(`frame ${frame} is outside the half-open B2 exposure range [0, ${EXPOSURE_END_FRAME_EXCLUSIVE})`);
  }
  const entry = entryAt(frame);
  const index = EXPOSURE.indexOf(entry);
  const next = EXPOSURE[index + 1];
  const drawing = KEY_DRAWINGS[entry.key];
  if (!next) return { frame, entry, drawing, production: "held" };

  const transition = classifyTransition(entry.key, next.key);
  if (transition.kind === "hold-cut") {
    const isBoundary = frame === entry.startFrame && index > 0 && classifyTransition(EXPOSURE[index - 1].key, entry.key).kind === "hold-cut";
    return { frame, entry, drawing, production: isBoundary ? "cut" : "held" };
  }
  const t = (frame - entry.startFrame) / entry.holdFrames;
  return { frame, entry, drawing: morph(drawing, KEY_DRAWINGS[next.key], t), production: "inbetween" };
}

/** Signed area of a closed path; used to measure how a frame differs from the last. */
export const pathArea = (path: readonly Point[]): number => {
  let sum = 0;
  for (let i = 0; i < path.length; i += 1) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
};

/** Total aperture area of a sampled frame, across however many holes it has. */
export const apertureArea = (drawing: KeyDrawing): number =>
  Object.keys(drawing)
    .filter((name) => name.startsWith("mouth-aperture"))
    .reduce((sum, name) => sum + pathArea(drawing[name]), 0);
