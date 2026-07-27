import { validateCNativeAsset } from "./conformance";

const errors = validateCNativeAsset();
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("M3-04 Base C native asset is structurally valid; no render, evaluation, or representation decision was made.");
