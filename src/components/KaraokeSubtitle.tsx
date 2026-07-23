import React from "react";
import { cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import type { Cut, VideoProject } from "../schema";
import type { CutTiming } from "../lib/timing";
import { activeLineAt } from "../lib/useAlignments";
import type { Alignment } from "../lib/viseme";

const LOCAL_FONT_ATTEMPT_TIMEOUT_MS = 18_000;
const LOCAL_FONT_MAX_ATTEMPTS = 2;

const loadLocalFont = (family: string, file: string, weight: string): string => {
  if (typeof document === "undefined") return family;
  const handle = delayRender(`Load local font ${file}`, { timeoutInMilliseconds: 60_000 });
  const loadAttempt = (remainingAttempts: number): void => {
    const font = new FontFace(family, `url(${staticFile(file)}) format("truetype")`, { style: "normal", weight });
    const timedLoad = new Promise<FontFace>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timed out loading local P0 font ${file}`)), LOCAL_FONT_ATTEMPT_TIMEOUT_MS);
      font.load().then(
        (loaded) => { clearTimeout(timeout); resolve(loaded); },
        (error: unknown) => { clearTimeout(timeout); reject(error); },
      );
    });
    timedLoad.then((loaded) => {
      (document.fonts as unknown as { add(value: FontFace): void }).add(loaded);
      continueRender(handle);
    }).catch((error: unknown) => {
      if (remainingAttempts > 1) {
        loadAttempt(remainingAttempts - 1);
        return;
      }
      const reason = error instanceof Error ? error.message : String(error);
      cancelRender(new Error(`Failed to load local P0 font ${file} after ${LOCAL_FONT_MAX_ATTEMPTS} attempts: ${reason}`));
    });
  };
  loadAttempt(LOCAL_FONT_MAX_ATTEMPTS);
  return family;
};

const fontFamily = loadLocalFont("Klee One", "fonts/KleeOne-SemiBold.ttf", "600");

/**
 * カラオケ字幕: アラインメントの文字タイムスタンプで発話済みの文字をハイライトする。
 * アラインメント未生成の行は全文を通常色で表示(フォールバック)。
 * 表示テキストは SubtitleSpec(Subtitle Agent) があればそれを、なければ dialogue.text を使う。
 */
export const KaraokeSubtitle: React.FC<{
  project: VideoProject;
  cut: Cut;
  timing: CutTiming;
  alignments: Map<string, Alignment>;
}> = ({ project, cut, timing, alignments }) => {
  const frame = useCurrentFrame();

  const active = activeLineAt(timing.lines, timing.durationFrames, frame);
  if (!active) return null;

  const dialogue = cut.dialogue[active.index];
  const spec = cut.subtitle?.lines.find((l) => l.lineId === dialogue.id);
  const displayText = spec?.displayText ?? dialogue.text;
  const color = project.meta.speakerColors[dialogue.speaker];
  const alignment = alignments.get(dialogue.id);

  // 表示テキスト中の「発話済み文字数」をアラインメントから求める。
  // 表示用テキストとttsTextが異なる場合があるため、文字数比で近似する。
  let spokenRatio = 1;
  if (alignment && alignment.chars.length > 0) {
    const spoken = alignment.chars.filter((c) => c.endMs <= active.sinceMs).length;
    spokenRatio = spoken / alignment.chars.length;
  }
  const plain = displayText.replace(/\n/g, "");
  const spokenCount = Math.round(plain.length * spokenRatio);

  let counted = 0;
  const rendered = displayText.split("\n").map((row, ri) => (
    <div key={ri}>
      {[...row].map((ch, ci) => {
        const isSpoken = counted < spokenCount;
        counted++;
        return (
          <span key={ci} style={{ color: isSpoken ? color : "#ffffff" }}>
            {ch}
          </span>
        );
      })}
    </div>
  ));

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 200,
        textAlign: "center",
        fontFamily,
        fontSize: 58,
        fontWeight: 600,
        lineHeight: 1.5,
        textShadow: "0 0 12px #000, 0 3px 6px #000, 0 0 24px #000",
        whiteSpace: "pre-wrap",
      }}
    >
      {rendered}
    </div>
  );
};
