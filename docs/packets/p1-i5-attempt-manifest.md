# p1-i5 · attempt ledger と manifest writer

**カード:** なし（共有インフラ）
**branch:** `codex/p1-i5-attempt-manifest`。`main` から分岐
**担当:** Forge
**読むもの:** [README](README.md) → `AGENTS.md` → `pipeline/p0/write-manifest.ts`（先例と、その欠陥） → 本 packet

## 目的

承認済みの render 試行回数を**機械的に強制**し、artifact の provenance に**実際に実行した argv** を記録する。

## 背景（実測済み）

### 1. render 試行の管理機構が無い

`pipeline/p0/render-baseline.ts` は既存ファイルへの上書きを拒否するが、`--force` も無く、
**試行2回目の命名規約も無い**。budget は `finalRenderAttemptsMax`（`p1-track-a-run-definition.json`）で
複数回を認めているのに、2回目をどこへ置くかが決まっていない。

### 2. manifest が実行していないコマンドを記録する

`pipeline/p0/write-manifest.ts` の `baselineCommand` は**ハードコードされた文字列リテラル**であり、
方式Aの artifact パスと `--frames=17617-18235` を含む。**別の artifact パスで実行すると、
実行していないコマンドを provenance として記録する。**

## 承認済み範囲

- 試行上限は `pipeline/m3/p1-track-a-run-definition.json` の `candidates[].budget.finalRenderAttemptsMax` から**読む**。
  **数値を書き写さない。上限を引き上げるコードを書かない**
- 新規 dependency は不可

## 依存

| 種別 | 内容 |
| --- | --- |
| 先行 packet | `p1-i2`（media / timebase）、`p1-i3`（contract registry） |
| merge 済み PR | なし |
| owner 判断 | なし |

`p1-i4` と**並行してよい**。enforcement 束縛は interface の背後に stub を置き、i4 が中身を埋める。

## 実装対象

```
pipeline/m3/p1/attempt.ts
pipeline/m3/p1/manifest.ts
pipeline/m3/p1/attempt.test.ts
pipeline/m3/p1/manifest.test.ts
```

## 触ってはいけないもの

- `pipeline/p0/**`、kanban、`docs/anti-patterns.md`、`package.json`、他 packet のディレクトリ

## 実装内容

### attempt ledger

```
out/m3/p1/<base>/attempt-<n>/     final 試行（予算対象）
out/m3/p1/<base>/preview/         preview（予算対象外）
out/m3/p1/<base>/attempts.json    ledger
```

- **追記専用。** 既存の attempt を上書きしない
- 試行 *n+1* は、試行 *n* が `outcome: "failed"` と理由を記録している場合にのみ許可する
- 上限に達したら**拒否して STOP メッセージを出す**
- **final と preview を機構的に分ける。** 承認されたフィールド名が `finalRenderAttemptsMax` である以上、
  final でない render は schema が既に含意している。ただし preview は `preview/` に置き、
  **conformance が読むことを拒否する**ディレクトリとし、それでも ledger には記録する。
  こうしないと preview が抜け道になる

### manifest writer

`baselineCommand` のハードコードを**廃止する**。記録するもの:

- **実行した argv**（`p1-i2` の wrapper から受け取る）
- 解決済みの実行ファイル絶対パス
- tool バージョン
- fixed-input policy の判定結果
- enforcement 証跡ドキュメントの SHA-256
- sequence 定義の SHA-256
- asset hash（D/E は `.blend`、C はソース blob）

`pipeline/p0/lib.ts` の `writeJson`（**末尾改行あり**）と `sha256`（**大文字hex**）を再利用する。
再現しないと artifact hash がずれる。

## 受入証拠

| コマンド | 期待 |
| --- | --- |
| `npx vitest run pipeline/m3/p1/attempt pipeline/m3/p1/manifest` | pass |
| `npm run typecheck` / `npm test` | pass |

**否定テスト。** 次はすべて**落ちなければならない**。

| 検査 | なぜ必要か |
| --- | --- |
| core base で attempt 3 が**拒否される** | 上限の機械的強制。これが無いと budget は書き置きに過ぎない |
| 直前の attempt が `failed` を記録していないのに次を開始する | 失敗していない試行の上に積ませない |
| 既存 attempt ディレクトリへの上書き | 証跡の破壊 |
| ledger の既存エントリの書き換え | 追記専用の担保 |
| conformance が `preview/` を読む | preview が抜け道になるのを防ぐ |
| manifest にリテラルのコマンド文字列が含まれる | ハードコード再発の検出 |

**provenance テスト。** 記録された argv を再実行すると、その artifact を生成したコマンドと**一致する**こと。

**レビュー観点（PR で明示的に確認する）。** `force` に類する名前の新しいフラグが増えていないか。
上限が JSON からではなくコードに書かれていないか。

## STOP 条件

- 上限を超える必要が生じた（**上限を上げるのではなく、止めて報告する**）
- preview と final の境界が機構的に定義できない

## 非対象

- render の実行
- 品質順位付け、方式採択

## PR 本文に書くこと

- attempt 3 が拒否されるテストの実行結果
- 上限を JSON から読んでいる箇所
- preview / final の境界がどう機構的に強制されているか
- manifest からハードコード文字列が消えたことの確認方法
