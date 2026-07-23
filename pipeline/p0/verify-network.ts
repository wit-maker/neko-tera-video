import { readFileSync } from "node:fs";
import { pathFromRoot } from "./lib";

const fontBoundaryFiles = [
  "src/components/ChalkBoard.tsx",
  "src/components/KaraokeSubtitle.tsx",
] as const;

const remoteFontLoader = /@remotion\/google-fonts/;
const remoteFontUrl = /https?:\/\/[^\s"')]+(?:font|fonts|gstatic)[^\s"')]*?/i;
const localFontContracts: Readonly<Record<(typeof fontBoundaryFiles)[number], string>> = {
  "src/components/ChalkBoard.tsx": 'loadLocalFont("Yusei Magic", "fonts/YuseiMagic-Regular.ttf", "400")',
  "src/components/KaraokeSubtitle.tsx": 'loadLocalFont("Klee One", "fonts/KleeOne-SemiBold.ttf", "600")',
};

export function findLocalFontBoundaryViolations(sources: Readonly<Record<string, string>>): string[] {
  return fontBoundaryFiles.flatMap((file) => {
    const source = sources[file] ?? "";
    const reasons: string[] = [];
    if (remoteFontLoader.test(source)) reasons.push("remote @remotion/google-fonts import");
    if (remoteFontUrl.test(source)) reasons.push("remote font URL");
    if (source.includes("public/fonts/")) reasons.push("staticFile path includes forbidden public/ prefix");
    if (!source.includes(localFontContracts[file])) reasons.push("approved local font path is missing");
    if (!source.includes("timeoutInMilliseconds: 60_000")) reasons.push("60 second outer font timeout is missing");
    if (!source.includes("LOCAL_FONT_ATTEMPT_TIMEOUT_MS = 18_000")) reasons.push("18 second attempt timeout is missing");
    if (!source.includes("LOCAL_FONT_MAX_ATTEMPTS = 2")) reasons.push("two-attempt font retry bound is missing");
    if (!source.includes("loadAttempt(remainingAttempts - 1)")) reasons.push("bounded font retry is missing");
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
