import { describe, expect, it } from "vitest";
import { stagedFixtureArtifactPath } from "./negative-fixture-path";

describe("P0 negative fixture paths", () => {
  it("keeps wrong-frame-count and truncated fixtures in their own staged artifacts", () => {
    const artifact = "out/p0/a-s7c6-e43ebb2";
    expect(stagedFixtureArtifactPath(artifact, `${artifact}/fixtures/wrong-frame-count.mp4`)).toBe(`${artifact}/fixtures/staged-wrong-frame-count`);
    expect(stagedFixtureArtifactPath(artifact, `${artifact}/fixtures/truncated.mp4`)).toBe(`${artifact}/fixtures/staged-truncated`);
  });
});
