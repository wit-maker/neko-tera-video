# neko-tera-video

にゃんこ先生とミケの会話劇ショート動画「話が通じない理由」を制作する、**データ駆動の Remotion 縦型ショート動画制作システム**。

7シーン × 6カット = 42カット(セリフ45行)を、縦型ショート(9:16, 1080×1920, 60fps, 総尺 約303.9秒)としてレンダリングする。

## 現在地と次期アーキテクチャ

- 現在の納品・再開状態: `PROJECT_STATE.md`
- Codex、Claude、そのほかのLLMが共有する設計運用規約: `LLM_GUIDE.md`
- 次期キャラクター表現基盤のCTO提案: `docs/character-architecture-strategy.md`
- 提案・承認・未決事項の状態管理: `docs/architecture-governance.md`
- 採択済みの比較境界: `docs/adr/001-next-character-comparison-boundaries.md`
- PoC前・方式別・採用後の環境拡張提案: `docs/tooling-extension-strategy.md`
- 実際の失敗から得た再発防止ルール: `docs/anti-patterns.md`
- エージェントが必ず守るプロジェクト規約: `AGENTS.md`

## 設計思想: video.json = 単一の真実 (SSOT)

このリポジトリの中核は、単発の動画ファイルではなく **`video.json` を単一の真実(Single Source of Truth)とする完全データ駆動のパイプライン**である。

- 脚本・演出・声・組版・音のすべては `video.json` に集約され、zod スキーマ(`src/schema.ts`)で検証される。
- 創造的判断(脚本・演出・組版・QC評価)は AI エージェント(`agents/*.md`)が担い、その出力は必ず `video.json` の担当フィールドへの書き戻しに限定される。
- 機械的変換は決定的スクリプト(`pipeline/`)が担い、冪等に実行される。
- 全アニメーションはフレーム駆動(`useCurrentFrame`)で、乱数もシード固定。**同一入力 → 同一出力**が保証される。
- したがって `video.json` を差し替えてパイプラインを再実行すれば、別の動画が決定的に再生成される。

派生データ(生成物、手編集禁止):

- `public/audio-manifest.json`: 音声実測尺。**カット尺の唯一の根拠**。
- `public/alignment/*.json`: 文字レベルのタイムスタンプ。
- `src/patch-config.json` / `public/assets/cutout/mouth/patch-config.json`: 口パク配置情報(両方に書かれ、同期必須)。

> **注意**: `video.json` の `sound.sfx` と `subtitle` フィールドは手編集禁止。`sfxcue.mjs` / `typeset.mjs` が実行のたびにゼロから再構築して上書きする。恒久変更はスクリプト側の定義を変えること。

## パイプライン

`video.json` を入力に、以下の段階を順に実行して完成動画を得る。TypeScript 段は npm scripts、Python / mjs 段はコマンドを直接実行する。

```
video.json (SSOT)
   │
   ▼
tts        音声合成      pipeline/tts.ts        → public/audio/*.mp3, audio-manifest.json
align      強制整列      pipeline/align.py      → public/alignment/*.json
cutout     切り抜き      pipeline/cutout.py     → public/assets/cutout/
patch      口パッチ      pipeline/mouthpatch.py → cutout/mouth/, patch-config.json ×2
           背景消し込み  pipeline/fixbg.py      → public/assets/bg/
           SFXキュー     pipeline/sfxcue.mjs    → video.json(sound.sfx) 上書き
typeset    字幕組版      pipeline/typeset.mjs   → video.json(subtitle) 上書き
mix        音声ミックス  pipeline/mix.ts        → out/master-audio.wav
render     映像合成      remotion render Main   → out/master.mp4
encode     最終mux       pipeline/encode.ts     → out/final-master.mp4
```

- **tts**: `video.json` の dialogue を Fish Audio API で音声化。行単位で生成(1リクエスト500文字未満制約の回避)。
- **align**: stable-ts (Whisper) による文字レベルの強制アラインメント。口パク(viseme)とカラオケ字幕の根拠。
- **cutout / patch / fixbg**: 画像処理系(クロマキー切り抜き、口だけパッチ生成、背景の小黒板インペイント)。
- **typeset / sfxcue**: `video.json` の subtitle / sound.sfx を機械的に再構築(冪等)。
- **mix**: セリフ + BGM + 環境音 + SFX を ffmpeg で直接タイムライン合成。2パス loudnorm で -14 LUFS に着地。
- **render**: Remotion による 60fps フレームレンダリング(h264 crf16、視覚的無損失級)。
- **encode**: 映像コピー + AAC 320k + faststart で `final-master.mp4` を生成。

## npm scripts

`package.json` に定義された実在のスクリプトのみ:

| コマンド | 内容 |
|---|---|
| `npm run studio` | Remotion Studio を起動(合成のプレビュー・部分検証) |
| `npm run render` | `Main` コンポジションを `out/master.mp4` にレンダー(h264, crf16) |
| `npm run validate` | `video.json` をスキーマ検証(`pipeline/validate.ts`) |
| `npm run select-voices` | ボイス候補選定(`pipeline/select-voices.ts`) |
| `npm run tts` | dialogue を音声合成(`pipeline/tts.ts`) |
| `npm run mix` | 音声ミックスして `out/master-audio.wav` を生成(`pipeline/mix.ts`) |
| `npm run encode` | 最終 mux で `out/final-master.mp4` を生成(`pipeline/encode.ts`) |
| `npm run typecheck` | `tsc --noEmit`(型検査。CI でも実行) |

> Python 系工程(`align.py` / `cutout.py` / `mouthpatch.py` / `fixbg.py` / `sfxcue.mjs` / `typeset.mjs`)は npm script 化されておらず、`python pipeline/<name>.py` / `node pipeline/<name>.mjs` として直接実行する。

## 前提・セットアップ

### Node.js

- Node.js 20(CI が使用するバージョン)。
- 依存インストール: `npm install`。

### Python(画像処理と align.py で環境が分かれる)

- **画像処理系**(`cutout.py` / `mouthpatch.py` / `fixbg.py` / `probe.py` / `contactsheet.py`)は **system の `python` コマンドで実行する**(Pillow / numpy を使用)。
- **`.venv/` は `align.py`(stable-ts / Whisper)専用**で、画像処理系の依存(Pillow など)は入っていない。画像処理系を `.venv` の python で実行すると `ModuleNotFoundError` で失敗する。
- `.venv/` は `.gitignore` 済み(コミットしない)。

### ffmpeg / ffprobe

- ミックス・計測・エンコードにローカルの ffmpeg / ffprobe を使用する。

### FISH_API_KEY(秘匿情報)

- TTS(Fish Audio API)には `FISH_API_KEY` が必要。
- **`.env` に置き、決してコミットしないこと。** `.env` は `.gitignore` 済み。
- リポジトリに実際のキー値を書き込まない。

例(`.env`、値はプレースホルダ):

```
FISH_API_KEY=your-fish-audio-api-key-here
```

## ディレクトリ構成

```
neko-tera-video/
├── video.json              SSOT。全工程の入力
├── package.json            npm scripts / 依存定義
├── remotion.config.ts      Remotion 設定
├── tsconfig.json
├── src/                    Remotion レンダラー(最終出力段)
│   ├── Root.tsx / Main.tsx / index.ts
│   ├── schema.ts           video.json の zod スキーマ
│   ├── patch-config.json   口パク配置(生成物・派生)
│   ├── components/         CutView / Character / ChalkBoard / KaraokeSubtitle / Effects / Steam / Grade
│   └── lib/                timing / chalk / viseme / useAlignments
├── pipeline/               決定的パイプライン(TS / Python / mjs)
│   ├── tts.ts / mix.ts / encode.ts / validate.ts / select-voices.ts
│   ├── align.py / cutout.py / mouthpatch.py / fixbg.py
│   ├── sfxcue.mjs / typeset.mjs
│   └── probe.py / contactsheet.py / print-timing.ts / env.ts
├── agents/                 AI エージェント定義(story / voice-director / visual-director / subtitle / qc)
├── docs/                   設計ドキュメント(cto-handoff, tech-lead-plan, qc-*, script-v2 ほか)
├── public/                 素材と派生データ
│   ├── assets/             bg / chars / cutout / fx
│   ├── audio/ alignment/ bgm/ ambience/ sfx/
│   └── audio-manifest.json
└── .github/workflows/      CI(typecheck)
```

`.gitignore` 対象(生成物・環境): `node_modules/`, `.venv/`, `out/`, `.env`, `*.log` ほか。

## レンダリング手順

`video.json` と素材が揃っている前提での標準フロー:

1. **依存準備**: `npm install`。`.env` に `FISH_API_KEY` を設定。Python 環境(system python / align 用 `.venv`)と ffmpeg を用意。
2. **検証**: `npm run validate` で `video.json` がスキーマに適合することを確認。型検査は `npm run typecheck`。
3. **音声**: `npm run tts`(dialogue 変更時)→ `python pipeline/align.py`(音声再生成後)。
4. **画像**(素材差し替え時のみ): `python pipeline/fixbg.py` → `python pipeline/cutout.py` → `python pipeline/mouthpatch.py`。
5. **導出フィールド**: `node pipeline/sfxcue.mjs`(黒板演出変更時)、`node pipeline/typeset.mjs`(セリフ変更時)。
6. **音声ミックス**: `npm run mix` → `out/master-audio.wav`。
7. **映像レンダー**: `npm run render` → `out/master.mp4`(全編は数十分規模。バックグラウンド実行し、起動と完了を確認すること)。
8. **最終エンコード**: `npm run encode` → `out/final-master.mp4`。ラウドネス実測値がログ出力される。

プレビュー・部分検証は `npm run studio`(Remotion Studio)や `npx remotion still Main --frame=<N> --output=out/qc.png`(単フレーム検分)を用いる。

各工程の再実行契機の詳細は `docs/cto-handoff.md`(データフロー表)を参照。
