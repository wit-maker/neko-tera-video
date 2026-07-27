/**
 * p1-i3 typed hole for Base E (M3-09, `p1-e-render.md`).
 *
 * Comparison-relevant fields are filled in now, from the shared values in
 * `types.ts`. Method-specific fields (`renderer`, `camera.projection`,
 * `debugPass`) are `undefined` -- p1-e fills them in and must not touch
 * anything else in this file's exported object literal, so `index.ts`'s
 * cross-base invariant check keeps catching any accidental drift.
 *
 * E is the one exception to `camera.authoredIn`: `pipeline/m3/e/build_asset.py`
 * parents its own ortho camera to a `view-pivot` and the M3-08 manifest
 * requires `view.authoredInAsset === true` (`pipeline/m3/e/conformance.ts`).
 * `camera.authoredIn` is therefore fixed to `"asset"` here -- not a hole, and
 * not a choice p1-e gets to make -- while `camera.projection` remains a hole
 * for p1-e to fill with the asset's actual authored projection kind.
 *
 * Decision 6 requires E's authored camera to still resolve to the same
 * shared `framing.landmarks` within `framing.tolerancePx` as every other
 * method, even though it does not take a render-side comparison camera.
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

export const E_CONTRACT: P1MethodContract = {
  base: "E",
  sequenceIds: SHARED_SEQUENCE_IDS,
  timebase: SHARED_TIMEBASE,
  raster: SHARED_RASTER,
  alpha: "opaque",
  framing: SHARED_FRAMING,
  camera: {
    projection: undefined,
    yawLimitDegrees: 15,
    pitchLimitDegrees: 10,
    authoredIn: "asset",
  },
  crop: SHARED_CROP,
  stills: SHARED_STILLS,
  presentation: PRESENTATION_ORDER,
  renderer: undefined,
  debugPass: undefined,
};
