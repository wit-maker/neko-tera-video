import { B1_STATE_RECORD, validateB1Artifact } from "./conformance";

const errors = validateB1Artifact();
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("M3-10 Base B1 state-count and transition-boundary artifact is structurally valid.");
console.log(B1_STATE_RECORD.assumptionWarning);
for (const entry of B1_STATE_RECORD.perGranularity) {
  console.log(`${entry.granularity}: ${entry.wholeHeadStates.toLocaleString("en-US")} whole-head states, ${entry.explosionRatio}x a factorised set of ${entry.factorisedComparison}`);
}
console.log("Finalist eligibility stays OPEN; no quality ranking or representation decision was made.");
