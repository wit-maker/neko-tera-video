import { readFileSync } from "node:fs";
import { pathFromRoot } from "./lib";

const fontBoundaryFiles = [
  "src/components/ChalkBoard.tsx",
  "src/components/KaraokeSubtitle.tsx",
] as const;

const remoteFontLoader = /@remotion\/google-fonts/;
const remoteFontUrl = /https?:\/\/[^\s"')]+(?:font|fonts|gstatic)[^\s"')]*?/i;

export function findLocalFontBoundaryViolations(sources: Readonly<Record<string, string>>): string[] {
  return fontBoundaryFiles.flatMap((file) => {
    const source = sources[file] ?? "";
    const reasons: string[] = [];
    if (remoteFontLoader.test(source)) reasons.push("remote @remotion/google-fonts import");
    if (remoteFontUrl.test(source)) reasons.push("remote font URL");
    return reasons.map((reason) => `${file}: ${reason}`);
  });
}

export function assertLocalFontBoundary(): void {
  const sources = Object.fromEntries(fontBoundaryFiles.map((file) => [file, readFileSync(pathFromRoot(file), "utf8")]));
  const violations = findLocalFontBoundaryViolations(sources);
  if (violations.length > 0) throw new Error(`P0 network preflight failed: ${violations.join("; ")}`);
}

if (process.argv.includes("--verify")) {
  assertLocalFontBoundary();
  console.log(JSON.stringify({ status: "pass", boundary: "local-font-only", files: fontBoundaryFiles }, null, 2));
}
