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
});
