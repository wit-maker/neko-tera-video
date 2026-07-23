import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

type LocalFont = {
  family: string;
  file: string;
  weight: string;
};

const loaded = new Set<string>();

/**
 * Registers an explicitly versioned asset from public/fonts. This uses the
 * browser FontFace API directly so the render path has no remote font loader
 * and needs no additional package.
 */
export const loadLocalFont = ({ family, file, weight }: LocalFont): { fontFamily: string } => {
  const key = `${family}:${weight}:${file}`;
  if (typeof document === "undefined" || loaded.has(key)) return { fontFamily: family };
  loaded.add(key);

  const handle = delayRender(`Load local font ${file}`);
  const font = new FontFace(family, `url(${staticFile(file)})`, { style: "normal", weight });
  font.load()
    .then((loadedFont) => {
      (document.fonts as unknown as { add(font: FontFace): void }).add(loadedFont);
      continueRender(handle);
    })
    .catch((error: unknown) => {
      cancelRender(error instanceof Error ? error : new Error(String(error)));
    });

  return { fontFamily: family };
};
