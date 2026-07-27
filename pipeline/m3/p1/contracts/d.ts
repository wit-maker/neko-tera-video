/**
 * p1-i3 typed hole for Base D (M3-07, `p1-d-render.md`).
 *
 * Comparison-relevant fields are filled in now, from the shared values in
 * `types.ts`. Method-specific fields (`renderer`, `camera.projection`,
 * `debugPass`) are `undefined` -- p1-d fills them in and must not touch
 * anything else in this file's exported object literal, so `index.ts`'s
 * cross-base invariant check keeps catching any accidental drift.
 *
 * D's `.blend` (`pipeline/m3/d/build_asset.py`) has no camera at all.
 * `camera.authoredIn` is nonetheless fixed to `"comparison"`, not a hole:
 * only E may be `"asset"` (decision 6 / M3-08). Decision 6 explicitly assigns
 * D a render-side comparison camera ("D には render 側から比較カメラを与える"),
 * which p1-d must aim so the shared `framing.landmarks` land within
 * `framing.tolerancePx` -- exactly like every other non-E method.
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

export const D_CONTRACT: P1MethodContract = {
  base: "D",
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
