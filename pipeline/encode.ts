/**
 * 最終エンコード: Remotionレンダー(映像)+ mix.ts のマスター音声を結合する。
 *
 *   npm run render   → out/master.mp4   (映像 h264 crf16。音声はセリフのみなので破棄)
 *   npm run mix      → out/master-audio.wav
 *   npm run encode   → out/final-master.mp4 (映像そのままコピー + AAC 320k)
 *
 * 検収: 尺の一致(±0.1s)と最終ファイルのラウドネスを表示する。
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const videoIn = path.join(OUT, "master.mp4");
const audioIn = path.join(OUT, "master-audio.wav");
const finalOut = path.join(OUT, "final-master.mp4");

for (const f of [videoIn, audioIn]) {
  if (!fs.existsSync(f)) throw new Error(`入力がありません: ${f}(先に npm run render / npm run mix)`);
}

const probe = (f: string) =>
  parseFloat(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f],
      { encoding: "utf8" }
    ).trim()
  );
const vd = probe(videoIn);
const ad = probe(audioIn);
console.log(`video: ${vd.toFixed(2)}s / audio: ${ad.toFixed(2)}s (差 ${(vd - ad).toFixed(3)}s)`);
if (Math.abs(vd - ad) > 0.1) {
  console.warn("[warn] 映像と音声の尺が0.1s以上ずれています。video.json変更後は render/mix 両方の再実行が必要です。");
}

execFileSync(
  "ffmpeg",
  ["-hide_banner", "-y", "-i", videoIn, "-i", audioIn,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "320k",
    "-movflags", "+faststart", "-shortest", finalOut],
  { stdio: ["ignore", "inherit", "inherit"] }
);

// 検収: ラウドネスとトゥルーピーク(基準は docs/cto-handoff.md ADR-9: AACは≤-1.0 dBTP)
const verify = spawnSync(
  "ffmpeg",
  ["-hide_banner", "-nostats", "-i", finalOut, "-af", "ebur128=peak=true", "-f", "null", "-"],
  { encoding: "utf8" }
);
const stderr = verify.stderr ?? "";
const vi = [...stderr.matchAll(/I:\s+(-?[\d.]+)\s+LUFS/g)];
const tp = [...stderr.matchAll(/Peak:\s+(-?[\d.]+)\s+dBFS/g)];
const tpVal = tp.length ? parseFloat(tp[tp.length - 1][1]) : NaN;
console.log(
  `final: ${probe(finalOut).toFixed(2)}s, I=${vi[vi.length - 1]?.[1]} LUFS, TP=${tpVal} dBTP -> ${finalOut}`
);
if (!(tpVal <= -1.0)) console.warn(`[warn] 納品AACのトゥルーピークが基準(≤-1.0 dBTP)を超過: ${tpVal}`);
