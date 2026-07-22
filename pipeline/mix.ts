/**
 * ミックス(決定的処理): video.json + audio-manifest から最終マスター音声を構築する。
 *
 *   npm run mix   →  out/master-audio.wav (-14 LUFS ±0.5, TP -1.5)
 *
 * 構成:
 *   1. セリフ: public/audio/{lineId}.mp3 を行頭秒に配置(行単位loudnorm済み)
 *   2. BGM: bgmCueの連続区間ごとに配置。ebur128実測→-34LUFS基準、セリフでサイドチェインダッキング
 *   3. 環境音: ambience連続区間ごとに配置(-40LUFS基準、ループ)
 *   4. SFX: sound.sfx を配置(-26LUFS基準 + gainDb、durationSecでトリム+フェード)
 *   5. 2パスloudnormで -14 LUFS / TP -1.5 に着地
 *
 * タイミング規則は src/lib/timing.ts と同一(HEAD + Σ(実測尺+pause) + TAIL)。
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CUT_PADDING_HEAD_SEC, CUT_PADDING_TAIL_SEC, VideoProject } from "../src/schema";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "public");
const OUT = path.join(ROOT, "out");

const TARGET = { bgm: -34, ambience: -40, sfx: -26 }; // ミックス内の基準ラウドネス(LUFS)
const MASTER = { I: -14, TP: -1.5, LRA: 11 };

// ---------- タイムライン構築 ----------
type Seg = { file: string; startSec: number; endSec: number };
type SfxEvent = { file: string; atSec: number; gainDb: number; durationSec?: number };
type VoiceLine = { lineId: string; startSec: number };

const project = VideoProject.parse(JSON.parse(fs.readFileSync(path.join(ROOT, "video.json"), "utf8")));
const manifest: { lineId: string; durationMs: number }[] = JSON.parse(
  fs.readFileSync(path.join(PUB, "audio-manifest.json"), "utf8")
);
const durMs = new Map(manifest.map((m) => [m.lineId, m.durationMs]));

const voice: VoiceLine[] = [];
const sfx: SfxEvent[] = [];
type CutSound = { id: string; startSec: number; endSec: number; bgmCue: string; ambience: string };
const cutSounds: CutSound[] = [];

let cursor = 0;
for (const scene of project.scenes) {
  for (const cut of scene.cuts) {
    const cutStart = cursor;
    let cutLen: number;
    if (cut.dialogue.length === 0) {
      cutLen = cut.fixedDurationSec ?? 0;
    } else {
      let t = CUT_PADDING_HEAD_SEC;
      for (const d of cut.dialogue) {
        const dur = (durMs.get(d.id) ?? 0) / 1000;
        if (!durMs.has(d.id)) throw new Error(`${d.id}: audio-manifest に実測尺がありません`);
        voice.push({ lineId: d.id, startSec: cutStart + t });
        t += dur + d.pauseAfterSec;
      }
      cutLen = t + CUT_PADDING_TAIL_SEC;
    }
    for (const e of cut.sound.sfx) {
      sfx.push({ file: e.file, atSec: cutStart + e.atSec, gainDb: e.gainDb, durationSec: e.durationSec });
    }
    cutSounds.push({
      id: cut.id,
      startSec: cutStart,
      endSec: cutStart + cutLen,
      bgmCue: cut.sound.bgmCue,
      ambience: cut.sound.ambience,
    });
    cursor += cutLen;
  }
}
const totalSec = cursor;

// bgmCue / ambience の連続区間をまとめる
function runs(key: "bgmCue" | "ambience", dir: string): Seg[] {
  const segs: Seg[] = [];
  for (const c of cutSounds) {
    const v = c[key];
    if (v === "none") continue;
    const file = path.join(PUB, dir, `${v}.mp3`);
    const last = segs[segs.length - 1];
    if (last && last.file === file && Math.abs(last.endSec - c.startSec) < 1e-6) {
      last.endSec = c.endSec;
    } else {
      segs.push({ file, startSec: c.startSec, endSec: c.endSec });
    }
  }
  return segs;
}
let bgmSegs = runs("bgmCue", "bgm");
let ambSegs = runs("ambience", "ambience");

// 未配置ファイルは警告してスキップ(例: outro.mp3 未納品でも他を先にミックスできる)
const skipMissing = (segs: Seg[], label: string) =>
  segs.filter((s) => {
    if (fs.existsSync(s.file)) return true;
    console.warn(`[warn] ${label} 未配置のためスキップ: ${s.file}`);
    return false;
  });
bgmSegs = skipMissing(bgmSegs, "BGM");
ambSegs = skipMissing(ambSegs, "環境音");
const sfxEvents = sfx.filter((e) => {
  if (fs.existsSync(path.join(PUB, "sfx", e.file))) return true;
  console.warn(`[warn] SFX 未配置のためスキップ: ${e.file}`);
  return false;
});

// ---------- ラウドネス実測(ファイル単位、キャッシュ) ----------
const lufsCache = new Map<string, number>();
function measureLufs(file: string): number {
  const hit = lufsCache.get(file);
  if (hit !== undefined) return hit;
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", file, "-map", "a", "-af", "ebur128", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const m = [...(r.stderr ?? "").matchAll(/I:\s+(-?[\d.]+)\s+LUFS/g)];
  if (m.length === 0) throw new Error(`ebur128 計測失敗: ${file}`);
  const lufs = parseFloat(m[m.length - 1][1]);
  lufsCache.set(file, lufs);
  return lufs;
}

// ---------- filter_complex 生成 ----------
const inputs: string[] = [];
const graph: string[] = [];
const ms = (sec: number) => Math.max(0, Math.round(sec * 1000));

function addInput(file: string, loop = false): number {
  if (loop) inputs.push("-stream_loop", "-1");
  inputs.push("-i", file);
  return inputs.length === 0 ? 0 : inputs.filter((a) => a === "-i").length - 1;
}

// 1) セリフ
const voiceLabels: string[] = [];
for (const v of voice) {
  const idx = addInput(path.join(PUB, "audio", `${v.lineId}.mp3`));
  const lb = `v${idx}`;
  graph.push(
    `[${idx}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms(v.startSec)}:all=1[${lb}]`
  );
  voiceLabels.push(`[${lb}]`);
}
graph.push(`${voiceLabels.join("")}amix=inputs=${voiceLabels.length}:normalize=0:duration=longest[voiceraw]`);
graph.push(`[voiceraw]apad,atrim=0:${totalSec.toFixed(3)},asplit=2[voice][sc]`);

// 2) BGM(区間ごとに: ループ入力→トリム→フェード→基準音量→配置)
const bgmLabels: string[] = [];
for (const [i, s] of bgmSegs.entries()) {
  const len = s.endSec - s.startSec;
  const gain = TARGET.bgm - measureLufs(s.file);
  const idx = addInput(s.file, true);
  const fadeIn = 1.2;
  const fadeOut = 1.8;
  graph.push(
    `[${idx}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${len.toFixed(3)},` +
      `afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${(len - fadeOut).toFixed(3)}:d=${fadeOut},` +
      `volume=${gain.toFixed(2)}dB,adelay=${ms(s.startSec)}:all=1[bgm${i}]`
  );
  bgmLabels.push(`[bgm${i}]`);
}
if (bgmLabels.length > 0) {
  graph.push(`${bgmLabels.join("")}amix=inputs=${bgmLabels.length}:normalize=0:duration=longest[bgmraw]`);
  // セリフをキーにダッキング(声のある間 BGM を約 -8dB 沈める)
  graph.push(
    `[bgmraw][sc]sidechaincompress=threshold=0.02:ratio=6:attack=120:release=600:makeup=1[bgmduck]`
  );
} else {
  graph.push(`[sc]anullsink`); // sc未使用時の受け
  graph.push(`anullsrc=r=48000:cl=stereo,atrim=0:${totalSec.toFixed(3)}[bgmduck]`);
}

// 3) 環境音
const ambLabels: string[] = [];
for (const [i, s] of ambSegs.entries()) {
  const len = s.endSec - s.startSec;
  const gain = TARGET.ambience - measureLufs(s.file);
  const idx = addInput(s.file, true);
  graph.push(
    `[${idx}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${len.toFixed(3)},` +
      `afade=t=in:st=0:d=2,afade=t=out:st=${(len - 2).toFixed(3)}:d=2,` +
      `volume=${gain.toFixed(2)}dB,adelay=${ms(s.startSec)}:all=1[amb${i}]`
  );
  ambLabels.push(`[amb${i}]`);
}

// 4) SFX
const sfxLabels: string[] = [];
for (const [i, e] of sfxEvents.entries()) {
  const file = path.join(PUB, "sfx", e.file);
  const gain = TARGET.sfx - measureLufs(file) + e.gainDb;
  const idx = addInput(file);
  const trim = e.durationSec
    ? `atrim=0:${e.durationSec.toFixed(3)},afade=t=out:st=${Math.max(0, e.durationSec - 0.15).toFixed(3)}:d=0.15,`
    : "";
  graph.push(
    `[${idx}:a]aresample=48000,aformat=channel_layouts=stereo,${trim}` +
      `volume=${gain.toFixed(2)}dB,adelay=${ms(e.atSec)}:all=1[sfx${i}]`
  );
  sfxLabels.push(`[sfx${i}]`);
}

// 5) 全バス合流 → プリマスター
const buses = ["[voice]", "[bgmduck]", ...ambLabels, ...sfxLabels];
graph.push(
  `${buses.join("")}amix=inputs=${buses.length}:normalize=0:duration=longest,` +
    `apad,atrim=0:${totalSec.toFixed(3)}[premaster]`
);

// ---------- 実行 ----------
fs.mkdirSync(OUT, { recursive: true });
const scriptPath = path.join(OUT, "mix-filter.txt");
fs.writeFileSync(scriptPath, graph.join(";\n"), "utf8");

const premaster = path.join(OUT, "premaster.wav");
console.log(
  `timeline: ${totalSec.toFixed(1)}s / voice ${voice.length}行 / bgm ${bgmSegs.length}区間 / amb ${ambSegs.length}区間 / sfx ${sfxEvents.length}発`
);
execFileSync(
  "ffmpeg",
  ["-hide_banner", "-y", ...inputs, "-filter_complex_script", scriptPath, "-map", "[premaster]", "-ar", "48000", premaster],
  { stdio: ["ignore", "inherit", "inherit"] }
);

// 2パス loudnorm
const pass1 = spawnSync(
  "ffmpeg",
  ["-hide_banner", "-nostats", "-i", premaster, "-af",
    `loudnorm=I=${MASTER.I}:TP=${MASTER.TP}:LRA=${MASTER.LRA}:print_format=json`, "-f", "null", "-"],
  { encoding: "utf8" }
);
const jsonMatch = (pass1.stderr ?? "").match(/\{[\s\S]*\}/);
if (!jsonMatch) throw new Error("loudnorm 1パス目の計測に失敗しました");
const m1 = JSON.parse(jsonMatch[0]);
console.log(`premaster: I=${m1.input_i} LUFS, TP=${m1.input_tp} dBTP`);

const masterOut = path.join(OUT, "master-audio.wav");
execFileSync(
  "ffmpeg",
  ["-hide_banner", "-y", "-i", premaster, "-af",
    `loudnorm=I=${MASTER.I}:TP=${MASTER.TP}:LRA=${MASTER.LRA}` +
      `:measured_I=${m1.input_i}:measured_TP=${m1.input_tp}:measured_LRA=${m1.input_lra}` +
      `:measured_thresh=${m1.input_thresh}:offset=${m1.target_offset}:linear=true`,
    "-ar", "48000", masterOut],
  { stdio: ["ignore", "inherit", "inherit"] }
);

// 検収: マスター実測
const verify = spawnSync(
  "ffmpeg",
  ["-hide_banner", "-nostats", "-i", masterOut, "-af", "ebur128", "-f", "null", "-"],
  { encoding: "utf8" }
);
const vi = [...(verify.stderr ?? "").matchAll(/I:\s+(-?[\d.]+)\s+LUFS/g)];
console.log(`master: I=${vi[vi.length - 1]?.[1]} LUFS -> ${masterOut}`);
