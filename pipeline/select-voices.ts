/**
 * Fish Audioの日本語音声モデルを検索し、キャラ候補の一覧と試聴サンプルを生成する。
 *
 * 使い方:
 *   FISH_API_KEY=... npx tsx pipeline/select-voices.ts            # 候補一覧のみ(公式preview URL付き)
 *   FISH_API_KEY=... npx tsx pipeline/select-voices.ts --samples  # 候補ごとに台本セリフで試聴mp3も生成
 *
 * 出力: docs/voice-candidates.md と public/audio/voice-samples/*.mp3
 */
import "./env";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const API = "https://api.fish.audio";
const KEY = process.env.FISH_API_KEY;
if (!KEY) {
  console.error("FISH_API_KEY が未設定です");
  process.exit(1);
}

// キャラごとの検索条件と試聴セリフ
const ROLES = [
  {
    role: "sensei",
    label: "にゃんこ先生(落ち着いた低めの声)",
    queries: ["男性 落ち着き", "ナレーション 男性", "渋い"],
    sampleText:
      "頭の中の辞書は、一匹ずつ違う。しかも、使っている言葉が同じだから、違っていることに気づけない。",
  },
  {
    role: "mike",
    label: "ミケ(若く素直な声)",
    queries: ["少年", "若い 男性", "元気"],
    sampleText:
      "同じものを見ているのに、見えている世界が、違う。……どうして、こんなにも話が通じないんでしょう。",
  },
] as const;

type Model = {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  languages?: string[];
  language?: string;
  like_count?: number;
  task_count?: number;
  preview_url?: string;
  samples?: { audio?: string }[];
};

async function searchModels(title: string): Promise<Model[]> {
  const url = new URL(`${API}/model`);
  url.searchParams.set("title", title);
  url.searchParams.set("language", "ja");
  url.searchParams.set("sort_by", "score");
  url.searchParams.set("page_size", "8");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } });
  if (!res.ok) throw new Error(`model search failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { items: Model[] };
  return json.items ?? [];
}

async function tts(text: string, referenceId: string): Promise<ArrayBuffer> {
  const res = await fetch(`${API}/v1/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      model: process.env.FISH_TTS_MODEL ?? "s2.1-pro-free",
    },
    body: JSON.stringify({ text, reference_id: referenceId, format: "mp3" }),
  });
  if (!res.ok) throw new Error(`tts failed: ${res.status} ${await res.text()}`);
  return res.arrayBuffer();
}

const modelId = (m: Model) => m._id ?? m.id ?? "";

async function main() {
  const generateSamples = process.argv.includes("--samples");
  const sampleDir = join(import.meta.dirname, "..", "public", "audio", "voice-samples");
  mkdirSync(sampleDir, { recursive: true });

  const lines: string[] = ["# Fish Audio 声候補", ""];

  for (const role of ROLES) {
    lines.push(`## ${role.label}`, "");
    const seen = new Set<string>();
    const candidates: Model[] = [];
    for (const q of role.queries) {
      for (const m of await searchModels(q)) {
        const id = modelId(m);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        candidates.push(m);
      }
    }
    // 人気(task_count)上位5件に絞る
    candidates.sort((a, b) => (b.task_count ?? 0) - (a.task_count ?? 0));
    const top = candidates.slice(0, 5);

    for (const m of top) {
      const id = modelId(m);
      lines.push(
        `### ${m.title}`,
        `- reference_id: \`${id}\``,
        `- 利用回数: ${m.task_count ?? "?"} / いいね: ${m.like_count ?? "?"}`,
        m.preview_url ? `- 公式プレビュー: ${m.preview_url}` : "- 公式プレビュー: なし"
      );
      if (generateSamples) {
        const file = `${role.role}-${id}.mp3`;
        try {
          const audio = await tts(role.sampleText, id);
          writeFileSync(join(sampleDir, file), Buffer.from(audio));
          lines.push(`- 台本セリフでの試聴: public/audio/voice-samples/${file}`);
        } catch (e) {
          lines.push(`- 台本セリフでの試聴: 生成失敗 (${(e as Error).message})`);
        }
      }
      lines.push("");
    }
  }

  const outPath = join(import.meta.dirname, "..", "docs", "voice-candidates.md");
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`候補一覧を書き出しました: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
