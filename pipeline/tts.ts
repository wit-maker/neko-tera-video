/**
 * video.json の全セリフ行をFish Audioで合成し、loudnorm正規化してmanifestを書き出す。
 *
 * 使い方:
 *   FISH_API_KEY=... npx tsx pipeline/tts.ts                 # 未生成の行のみ合成
 *   FISH_API_KEY=... npx tsx pipeline/tts.ts --force         # 全行を再合成
 *   FISH_API_KEY=... npx tsx pipeline/tts.ts --dry-run s1c2-01  # 指定行のみ合成(試聴用)
 *
 * 出力:
 *   public/audio/<lineId>.mp3        (正規化済み)
 *   public/audio-manifest.json       [{ lineId, file, durationMs }]
 *
 * 依存: ffmpeg (PATH上に必要。loudnorm I=-18 で行単位を揃え、最終ミックスで-14 LUFSへ)
 */
import "./env";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseFile } from "music-metadata";
import { VideoProject } from "../src/schema";

const ROOT = join(import.meta.dirname, "..");
const AUDIO_DIR = join(ROOT, "public", "audio");
const MANIFEST = join(ROOT, "public", "audio-manifest.json");

const KEY = process.env.FISH_API_KEY;
if (!KEY) {
  console.error("FISH_API_KEY が未設定です");
  process.exit(1);
}

const project = VideoProject.parse(JSON.parse(readFileSync(join(ROOT, "video.json"), "utf8")));

type Line = {
  id: string;
  text: string;
  ttsText?: string;
  speed: number;
  referenceId: string;
};

const lines: Line[] = [];
for (const scene of project.scenes) {
  for (const cut of scene.cuts) {
    for (const d of cut.dialogue) {
      const voice = project.voices[d.speaker];
      if (!voice?.referenceId) {
        console.error(`話者 ${d.speaker} の referenceId が未設定です(video.json voices)`);
        process.exit(1);
      }
      lines.push({
        id: d.id,
        text: d.text,
        ttsText: d.ttsText,
        speed: d.speed,
        referenceId: voice.referenceId,
      });
    }
  }
}

// Fish Audio無料枠: 1リクエスト500文字未満。文境界で分割し、複数回合成して結合する。
const MAX_CHARS_PER_REQUEST = 480;

function splitForApi(text: string): string[] {
  if (text.length < MAX_CHARS_PER_REQUEST) return [text];
  const sentences = text.match(/[^。!?!?]*[。!?!?]+|[^。!?!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (s.length >= MAX_CHARS_PER_REQUEST) {
      // 一文が上限を超える場合は読点で強制分割
      if (current) chunks.push(current);
      current = "";
      for (const part of s.match(/[^、]*、?/g) ?? [s]) {
        if (current.length + part.length >= MAX_CHARS_PER_REQUEST) {
          if (current) chunks.push(current);
          current = part;
        } else {
          current += part;
        }
      }
      continue;
    }
    if (current.length + s.length >= MAX_CHARS_PER_REQUEST) {
      chunks.push(current);
      current = s;
    } else {
      current += s;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function ttsRequest(text: string, line: Line): Promise<Buffer> {
  const res = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      // s2.1-pro-free: 2026年7月末まで無料(フェアユース)。有料運用時は FISH_TTS_MODEL=s2.1-pro で上書き
      model: process.env.FISH_TTS_MODEL ?? "s2.1-pro-free",
    },
    body: JSON.stringify({
      text,
      reference_id: line.referenceId,
      format: "mp3",
      prosody: { speed: line.speed, volume: 0 },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${line.id}: ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

/** 500文字未満のチャンクに分けて合成し、複数チャンクならffmpegで無劣化結合する */
async function synthesize(line: Line): Promise<Buffer> {
  const chunks = splitForApi((line.ttsText ?? line.text).replace(/\n/g, ""));
  if (chunks.length === 1) return ttsRequest(chunks[0], line);

  console.log(`  (${chunks.length}分割で合成: 500文字制限)`);
  const partPaths: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const buf = await ttsRequest(chunks[i], line);
    const p = join(AUDIO_DIR, `${line.id}.part${i}.mp3`);
    writeFileSync(p, buf);
    partPaths.push(p);
  }
  const listPath = join(AUDIO_DIR, `${line.id}.concat.txt`);
  writeFileSync(
    listPath,
    partPaths.map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"),
    "utf8"
  );
  const joinedPath = join(AUDIO_DIR, `${line.id}.joined.mp3`);
  execFileSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", joinedPath]);
  const joined = readFileSync(joinedPath);
  for (const p of [...partPaths, listPath, joinedPath]) rmSync(p);
  return joined;
}

/** 行単位ラウドネス正規化(-18 LUFS)+前後の無音トリム */
function normalize(rawPath: string, outPath: string) {
  execFileSync("ffmpeg", [
    "-y",
    "-i",
    rawPath,
    "-af",
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05," +
      "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.10,areverse," +
      "loudnorm=I=-18:TP=-2:LRA=11",
    "-ar",
    "48000",
    "-b:a",
    "192k",
    outPath,
  ]);
}

async function main() {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const force = process.argv.includes("--force");
  const dryIdx = process.argv.indexOf("--dry-run");
  const only = dryIdx >= 0 ? process.argv[dryIdx + 1] : null;

  const targets = only ? lines.filter((l) => l.id === only) : lines;
  if (only && targets.length === 0) {
    console.error(`行ID ${only} が video.json に見つかりません`);
    process.exit(1);
  }

  const manifest: { lineId: string; file: string; durationMs: number }[] = existsSync(MANIFEST)
    ? JSON.parse(readFileSync(MANIFEST, "utf8"))
    : [];
  const byId = new Map(manifest.map((m) => [m.lineId, m]));

  for (const line of targets) {
    const outPath = join(AUDIO_DIR, `${line.id}.mp3`);
    if (!force && !only && existsSync(outPath) && byId.has(line.id)) continue;

    console.log(`合成中: ${line.id} 「${line.text.replace(/\n/g, "")}」`);
    const raw = await synthesize(line);
    const rawPath = join(AUDIO_DIR, `${line.id}.raw.mp3`);
    writeFileSync(rawPath, raw);
    normalize(rawPath, outPath);
    rmSync(rawPath);

    const meta = await parseFile(outPath);
    const durationMs = Math.round((meta.format.duration ?? 0) * 1000);
    if (durationMs <= 0) throw new Error(`${line.id}: 音声長が取得できません`);
    byId.set(line.id, { lineId: line.id, file: `audio/${line.id}.mp3`, durationMs });
  }

  // video.jsonの行順でmanifestを並べ替えて保存
  const ordered = lines.map((l) => byId.get(l.id)).filter(Boolean);
  writeFileSync(MANIFEST, JSON.stringify(ordered, null, 2), "utf8");
  console.log(`manifest更新: ${MANIFEST} (${ordered.length}/${lines.length}行)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
