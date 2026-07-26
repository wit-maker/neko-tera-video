import { B2_ASSET_SPACE, B2_MECHANISM, B2_STATUS, EXPOSURE, EXPOSURE_END_FRAME_EXCLUSIVE, KEY_DRAWINGS, KEY_IDS, NATIVE_ASSET_INPUTS, type B2MechanismDeclaration } from "./keys";
import { TRANSITIONS, sampleAt } from "./morph";

/**
 * M3-11 acceptance check. It records what the drawn 2D workflow can and cannot
 * do, and it fails if B2 is dressed up as one of the compared mechanisms. It
 * renders nothing and ranks nothing.
 */
export function validateB2Artifact(mechanism: B2MechanismDeclaration = B2_MECHANISM): string[] {
  const errors: string[] = [];

  // The M3-11 stop condition, enforced rather than described.
  if (mechanism.role !== "quality-ceiling-control") errors.push("B2 must stay the quality-ceiling control");
  if (mechanism.coreComparisonMember) errors.push("B2 must not be listed as a core comparison mechanism alongside A/C/D/E");
  if (mechanism.rankableAgainstCoreMechanisms) errors.push("B2 must not be presented as rankable against the core mechanisms");
  if (mechanism.mechanismClass === "continuous-parametric") errors.push("B2 is keyframed vector 2D and must not be labelled continuous-parametric");
  if (B2_STATUS !== "PROPOSED") errors.push("B2 must remain a PROPOSED PoC artifact");

  if (NATIVE_ASSET_INPUTS.length > 0) errors.push("B2 must consume no external asset input");
  if (/\.png|staticFile|assets\/cutout|patch-config|bone|armature/i.test(JSON.stringify(KEY_DRAWINGS))) {
    errors.push("B2 must not reference a shared completed PNG, shared topology, or shared bones");
  }

  for (const id of KEY_IDS) {
    const drawing = KEY_DRAWINGS[id];
    if (Object.keys(drawing).length === 0) errors.push(`key ${id} has no authored path`);
    for (const [name, path] of Object.entries(drawing)) {
      if (path.length < 3) errors.push(`key ${id} path ${name} needs at least three points`);
      for (const q of path) {
        if (q.x < 0 || q.y < 0 || q.x > B2_ASSET_SPACE.width || q.y > B2_ASSET_SPACE.height) errors.push(`key ${id} path ${name} leaves the declared asset space`);
      }
    }
  }

  // The exposure sheet must tile its range exactly; a gap would be an unauthored frame.
  let cursor = 0;
  for (const entry of EXPOSURE) {
    if (entry.startFrame !== cursor) errors.push(`exposure sheet is not contiguous at frame ${entry.startFrame}`);
    if (entry.holdFrames <= 0) errors.push(`exposure entry ${entry.key} has a non-positive hold`);
    cursor = entry.startFrame + entry.holdFrames;
  }
  if (cursor !== EXPOSURE_END_FRAME_EXCLUSIVE) errors.push("exposure sheet does not end at the declared exclusive end frame");

  // The ceiling must be recorded, not silently interpolated away.
  const uninbetweenable = TRANSITIONS.filter((transition) => transition.kind === "hold-cut");
  if (uninbetweenable.length === 0) errors.push("B2 must exercise at least one transition its workflow cannot inbetween, or the ceiling is unmeasured");
  for (const transition of uninbetweenable) {
    if (!transition.reason) errors.push(`hold-cut ${transition.from} -> ${transition.to} must record why no correspondence exists`);
  }
  for (let frame = 0; frame < EXPOSURE_END_FRAME_EXCLUSIVE; frame += 1) {
    const sample = sampleAt(frame);
    if (sample.production === "inbetween" && Object.keys(sample.drawing).length !== Object.keys(KEY_DRAWINGS[sample.entry.key]).length) {
      errors.push(`frame ${frame} was inbetweened across a changing path set`);
    }
  }

  return errors;
}

/** The recorded production conditions and ceiling, for the M3-12 capability matrix. */
export const B2_CEILING_RECORD = {
  task: "M3-11",
  mechanism: B2_MECHANISM,
  authoredKeys: KEY_IDS.length,
  exposedFrames: EXPOSURE_END_FRAME_EXCLUSIVE,
  inbetweenableTransitions: TRANSITIONS.filter((t) => t.kind === "morph").length,
  holdCutTransitions: TRANSITIONS.filter((t) => t.kind === "hold-cut").map((t) => ({ from: t.from, to: t.to, reason: t.reason })),
  productionConditions: [
    "Every distinct mouth shape is an authored drawing; cost scales with the number of shapes, not with the length of the take.",
    "An inbetween exists only where two keys share path names and point counts.",
    "Time is discrete by construction: frames inside a block are held or linearly inbetweened, never continuously controlled.",
  ],
  observedCeiling: [
    "T3 contact splits the aperture into two holes. A single closed path cannot express two holes, so the pose is authored as separate paths and the approach into it is a cut rather than an inbetween.",
    "Revealing the tongue introduces a path absent from the neighbouring keys, so it too can only arrive on a cut.",
  ],
  notMeasuredHere: [
    "Whether the cuts read as acceptable at normal speed. That needs the real frames in M3-05's sibling render card and mi3san's eyes, not an assertion.",
  ],
} as const;
