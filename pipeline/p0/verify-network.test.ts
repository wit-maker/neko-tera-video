import { describe, expect, it } from "vitest";
import { assertLocalFontBoundary, findLocalFontBoundaryViolations } from "./verify-network";

describe("P0 local font boundary", () => {
  it("rejects remote font loaders before rendering", () => {
    expect(assertLocalFontBoundary).not.toThrow();
    expect(findLocalFontBoundaryViolations({
      "src/components/ChalkBoard.tsx": 'import { loadFont } from "@remotion/google-fonts/YuseiMagic";',
      "src/components/KaraokeSubtitle.tsx": "",
      "src/lib/local-font.ts": "",
    })).toContain("src/components/ChalkBoard.tsx: remote @remotion/google-fonts import");
  });

  it("requires the approved staticFile paths and bounded local FontFace retry contract", () => {
    const violations = findLocalFontBoundaryViolations({
      "src/components/ChalkBoard.tsx": 'loadLocalFont("Yusei Magic", "public/fonts/YuseiMagic-Regular.ttf", "400")',
      "src/components/KaraokeSubtitle.tsx": 'loadLocalFont("Klee One", "fonts/KleeOne-SemiBold.ttf", "600")',
    });
    expect(violations).toContain("src/components/ChalkBoard.tsx: staticFile path includes forbidden public/ prefix");
    expect(violations).toContain("src/components/ChalkBoard.tsx: 60 second outer font timeout is missing");
    expect(violations).toContain("src/components/KaraokeSubtitle.tsx: two-attempt font retry bound is missing");
  });
});
