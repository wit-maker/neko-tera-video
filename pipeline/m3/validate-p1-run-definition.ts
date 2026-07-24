import { P1_TRACK_A_RUN_DEFINITION, validateP1TrackARunDefinition } from "./p1-run-definition";

const errors = validateP1TrackARunDefinition(P1_TRACK_A_RUN_DEFINITION);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("M3-00 P1 Track A run definition is structurally valid; no render, evaluation, or representation decision was made.");
