import { P0B_WORKING_CONTRACT, validateP0bContract } from "./comparison-contract";

const errors = validateP0bContract(P0B_WORKING_CONTRACT);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("P0b working comparison contract is structurally valid; no quality or representation decision was made.");
