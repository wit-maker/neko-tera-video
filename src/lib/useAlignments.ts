import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type { Cut } from "../schema";
import type { Alignment } from "./viseme";

/**
 * カット内の全セリフ行のアラインメントJSONを読み込む。
 * 字幕(カラオケ)とキャラ(口パク)で共有するためCutViewで1回だけ呼ぶ。
 * 未生成の行はmapに入らない(呼び出し側でフォールバック)。
 */
export const useAlignments = (cut: Cut): Map<string, Alignment> | null => {
  const [alignments, setAlignments] = useState<Map<string, Alignment> | null>(null);
  const [handle] = useState(() => delayRender(`load alignments for ${cut.id}`));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = new Map<string, Alignment>();
      await Promise.all(
        cut.dialogue.map(async (d) => {
          try {
            const res = await fetch(staticFile(`alignment/${d.id}.json`));
            if (res.ok) map.set(d.id, (await res.json()) as Alignment);
          } catch {
            // 未生成: フォールバック表示
          }
        })
      );
      if (!cancelled) {
        setAlignments(map);
        continueRender(handle);
      }
    })().catch((e) => cancelRender(e));
    return () => {
      cancelled = true;
    };
  }, [cut, handle]);

  return alignments;
};

/** いま発話中(または直近で表示すべき)の行: 行の開始〜次の行の開始まで */
export const activeLineAt = (
  lines: { lineId: string; fromFrame: number; durationFrames: number }[],
  durationFrames: number,
  frame: number
): { index: number; sinceMs: number; speaking: boolean } | null => {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    const endFrame = next ? next.fromFrame : durationFrames;
    if (frame >= line.fromFrame && frame < endFrame) {
      const sinceMs = ((frame - line.fromFrame) / 60) * 1000;
      return { index: i, sinceMs, speaking: frame < line.fromFrame + line.durationFrames };
    }
  }
  return null;
};
