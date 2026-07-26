# p1-i2 · ffmpeg / ffprobe wrapper と timebase 変換

**カード:** なし（共有インフラ）
**branch:** `codex/p1-i2-media`。`main` から分岐
**担当:** Forge
**読むもの:** [README](README.md) → `AGENTS.md` → 本 packet

## 目的

ffmpeg / ffprobe の**唯一の入口**を作り、inclusive-global ↔ half-open-local の timebase 変換を型付きで提供する。
render 4カードが各自で argv を組み立てると、4通りの微妙に違う probe が生まれ、比較の前提が崩れる。

## 背景（実測済み）

P0 には ffmpeg / ffprobe の wrapper が**存在しない**。`pipeline/p0/validate.ts`、`evaluate.ts`、
`visual-integrity.ts`、`negative-test.ts` が**各自で argv を手組みしている**。`pipeline/p0/lib.ts` にも
frame 抽出ヘルパは無い。P1 で4方式が同じことをすれば同じ重複が4倍になる。

timebase も分裂している。P0 は inclusive global（`17617..18235`）で記録し、
`pipeline/p0b/comparison-contract.ts` の `validateTimebase` は `{fps:60, startFrame:0, endFrameExclusive:619}`
を要求する。**変換するコードはリポジトリのどこにも無い。**

## 承認済み範囲

- 新規 dependency の追加は**不可**。`node:child_process` と既存の `pipeline/p0/lib.ts` だけで書く
- `ffmpeg` / `ffprobe` は `PATH` にある前提（P0 も同じ前提で動いている）。バージョンは**記録するが固定しない**

## 依存

| 種別 | 内容 |
| --- | --- |
| 先行 packet | なし。`p1-i1` と並行してよい |
| merge 済み PR | なし |
| owner 判断 | なし |

## 実装対象

```
pipeline/m3/p1/media.ts
pipeline/m3/p1/timebase.ts
pipeline/m3/p1/media.test.ts
pipeline/m3/p1/timebase.test.ts
```

## 触ってはいけないもの

- `pipeline/p0/**` — **この packet で P0 をリファクタしない。** P0a の証跡は `TRACKED_TEXT_BLOBS` で
  blob 固定されており、触ると P0a の再現契約が壊れる。等価性は**テストで証明する**（後述）
- kanban、`docs/anti-patterns.md`、`package.json`、他 packet のディレクトリ

## 実装内容

### `media.ts`

`pipeline/p0/lib.ts` の `run` / `runResult` を**再利用**する（Windows の `.cmd` shim 処理が入っている）。

必要な機能:

- `probeStream(file)` — `nb_read_frames`、`avg_frame_rate`、`width`、`height`、**`pix_fmt`、color primaries / transfer / matrix / range** を型付きで返す。P0 は最初の4つしか見ていない。P0b の artifact contract は `color` と `alpha` を要求するので、ここで取れるようにする
- `decodeAllFrames(file)` — 全フレームデコード検査（P0 の `ffmpeg -map 0:v:0 -f null -` 相当）
- `extractFrame(file, frame, out)` — `select=eq(n,N)`
- `cropScale(file, frame, crop, out)` — crop + scale
- `encodeFromPngSequence(dir, pattern, out, opts)` — PNG 列から動画へ
- `frameDifference(a, b, out)` — `blend=all_mode=difference`（P0 の visual-integrity 相当）
- `toolVersions()` — ffmpeg / ffprobe のバージョン記録

### `timebase.ts`

inclusive-global ↔ half-open-local を型で区別する。`{ startFrame, endFrameExclusive }` と
`{ clipStart, clipEnd }` を混同できないようにする。

## 受入証拠

| コマンド | 期待 |
| --- | --- |
| `npx vitest run pipeline/m3/p1/media pipeline/m3/p1/timebase` | pass |
| `npm run typecheck` / `npm test` | pass |

**argv golden テスト（この packet の要）。** wrapper が生成する argv が、P0 の各手組み呼び出しと
**バイト一致**することをテストで固定する。対象は `pipeline/p0/validate.ts`、`evaluate.ts`、
`visual-integrity.ts` の ffmpeg / ffprobe 呼び出し。これが「P0 を触らずに等価性を証明する」方法である。

**timebase テスト。**

- 往復性: `local → global → local` が恒等
- 具体値: `17617..18235`（inclusive）→ `{startFrame: 0, endFrameExclusive: 619}`
- 境界: `endFrameExclusive` は最終フレームを**含まない**ことの明示テスト

**否定テスト。** 次はすべて**落ちなければならない**。

- `clipEnd < clipStart` の区間
- 総フレーム数が 0 または負になる区間
- inclusive と half-open を取り違えた代入（型で防げていることをコンパイルエラーとして確認するか、実行時に検出する）

**リポジトリ規約テスト。** `pipeline/m3/p1/**` の中で、`media.ts` 以外のファイルが
ffmpeg / ffprobe を spawn していないことを検査する。将来の packet が wrapper を迂回するのを止める。

## STOP 条件

- ffmpeg / ffprobe が `PATH` に無い
- 必要な機能が既存 dependency で実現できず、新規 dependency が要る
- P0 の argv を変えないと等価性テストが通らない場合（**P0 を変えずに止めて報告する**）

## 非対象

- P0 のリファクタリング
- render の実行
- 品質順位付け、方式採択

## PR 本文に書くこと

- argv golden テストが P0 のどの呼び出しを覆っているか、覆っていないものがあればどれか
- 観測した ffmpeg / ffprobe のバージョン（**固定はしない**）
- pix_fmt / color 系を取得できたか。取れない場合は P0b の `color` / `alpha` を何で埋めるのか
