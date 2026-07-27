import { REGISTRY, validateCrossBaseInvariants } from "./index";

const errors = validateCrossBaseInvariants(REGISTRY);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  "p1-i3 cross-base contract invariants hold across all 4 core methods (A/C/D/E): " +
    "raster/crop/stills/timebase/framing/presentation are byte-identical, " +
    'camera.authoredIn = "asset" is unique to E, and no leaf carries a budget ' +
    "or quality-ranking/scoring/decision field. Method-specific holes " +
    "(renderer, camera.projection, debugPass) remain unfilled by design -- " +
    "filling them is the render packets' job, not this one's. No render was " +
    "executed and no quality or representation decision was made.",
);
