/**
 * p1-i3 typed hole for Base C (M3-05, `p1-c2-render.md`).
 *
 * Comparison-relevant fields are filled in now, from the shared values in
 * `types.ts`. Method-specific fields (`renderer`, `camera.projection`,
 * `debugPass`) are `undefined` -- p1-c2 fills them in (its own rasteriser,
 * per decision 5) and must not touch anything else in this file's exported
 * object literal, so `index.ts`'s cross-base invariant check keeps catching
 * any accidental drift.
 *
 * `camera.authoredIn` is fixed to `"comparison"`, not a hole: only E may be
 * `"asset"` (decision 6 / M3-08). C is given a comparison camera at render time,
 * even though C's own native asset space (`pipeline/m3/c/asset.ts`) is what the
 * shared raster and framing landmarks were anchored to.
 */
import {
  PRESENTATION_ORDER,
  SHARED_CROP,
  SHARED_FRAMING,
  SHARED_RASTER,
  SHARED_SEQUENCE_IDS,
  SHARED_STILLS,
  SHARED_TIMEBASE,
  type P1MethodContract,
} from "./types";

export const C_CONTRACT: P1MethodContract = {
  base: "C",
  sequenceIds: SHARED_SEQUENCE_IDS,
  timebase: SHARED_TIMEBASE,
  raster: SHARED_RASTER,
  alpha: "opaque",
  framing: SHARED_FRAMING,
  camera: {
    projection: undefined,
    yawLimitDegrees: 15,
    pitchLimitDegrees: 10,
    authoredIn: "comparison",
  },
  crop: SHARED_CROP,
  stills: SHARED_STILLS,
  presentation: PRESENTATION_ORDER,
  renderer: undefined,
  debugPass: undefined,
};
