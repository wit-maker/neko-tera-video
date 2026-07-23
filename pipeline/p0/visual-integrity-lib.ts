export function maximumByteDifference(rawDifference: Uint8Array): number {
  let maximum = 0;
  for (const value of rawDifference) maximum = Math.max(maximum, value);
  return maximum;
}

export function visualIntegrityStatus(maximumDifferences: readonly number[]): "pass" | "fail" {
  return maximumDifferences.every((difference) => difference === 0) ? "pass" : "fail";
}
