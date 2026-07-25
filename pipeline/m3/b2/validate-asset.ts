import { validateB2Artifact } from "./conformance";

const errors = validateB2Artifact();
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("M3-11 Base B2 keyframed vector artifact is structurally valid; it is the quality-ceiling control and is not ranked against A/C/D/E.");
