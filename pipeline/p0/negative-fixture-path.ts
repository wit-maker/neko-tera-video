import { basename } from "node:path";

export function stagedFixtureArtifactPath(artifact: string, fixtureFile: string): string {
  return `${artifact}/fixtures/staged-${basename(fixtureFile, ".mp4")}`;
}
