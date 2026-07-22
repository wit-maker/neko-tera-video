/**
 * SFXキュー打ち(決定的・再実行可能)。
 * video.json の黒板アクション/カット演出から sound.sfx を毎回ゼロから再構築する。
 *
 *   node pipeline/sfxcue.mjs
 *
 * 規則:
 *  - 黒板ストローク(circle/line/arrow)の描き始めに chalk-write.mp3 を同期
 *    (長さは drawDurationSec+0.2 にトリム、-9dB)。label/erase は無音。
 *  - 演出SFX: s1c1 湯を注ぐ / s1c2 タブレットを伏せる / s3c6 チョークを置く / s7c6 お茶を注ぐ
 * タイミングは timing.ts と同じ規則(HEAD + Σ(実測尺+pause))で行頭秒を算出する。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const VIDEO = path.join(ROOT, "video.json");
const HEAD = 0.35; // schema.ts CUT_PADDING_HEAD_SEC と一致させること

const video = JSON.parse(fs.readFileSync(VIDEO, "utf8"));
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "public", "audio-manifest.json"), "utf8")
);
const durMs = new Map(manifest.map((m) => [m.lineId, m.durationMs]));

// カット内の各行の開始秒(timing.ts と同じ規則)
function lineStarts(cut) {
  const starts = new Map();
  let cursor = HEAD;
  for (const d of cut.dialogue ?? []) {
    starts.set(d.id, cursor);
    cursor += (durMs.get(d.id) ?? 0) / 1000 + (d.pauseAfterSec ?? 0);
  }
  return starts;
}

const STROKES = new Set(["circle", "line", "arrow"]);
// 演出SFX(カットID → エントリ)
const MANUAL = {
  s1c1: [{ file: "tea-pour.mp3", atSec: 1.0, gainDb: -7 }],
  s1c2: [{ file: "tablet-close.mp3", atSec: 0.3, gainDb: -5 }],
  s3c6: [{ file: "chalk-tap.mp3", atSec: 0.5, gainDb: -8 }],
  s7c6: [{ file: "tea-pour.mp3", atSec: 0.8, gainDb: -5 }],
};

let total = 0;
for (const scene of video.scenes) {
  for (const cut of scene.cuts) {
    const sfx = [...(MANUAL[cut.id] ?? [])];
    if (cut.board && cut.board.visible !== false) {
      const starts = lineStarts(cut);
      for (const a of cut.board.actions ?? []) {
        if (!STROKES.has(a.element.kind)) continue;
        const base = a.atLineId ? (starts.get(a.atLineId) ?? HEAD) : 0;
        sfx.push({
          file: "chalk-write.mp3",
          atSec: Math.round((base + (a.offsetSec ?? 0)) * 1000) / 1000,
          gainDb: -9,
          durationSec: Math.round(((a.drawDurationSec ?? 0.8) + 0.2) * 100) / 100,
        });
      }
    }
    sfx.sort((x, y) => x.atSec - y.atSec);
    cut.sound = { ...(cut.sound ?? {}), sfx };
    total += sfx.length;
  }
}

fs.writeFileSync(VIDEO, JSON.stringify(video, null, 2) + "\n", "utf8");
console.log(`sfx cues written: ${total}`);
