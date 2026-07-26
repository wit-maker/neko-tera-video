# p1-i6 · conformance / evaluation / presentation の共通生成器

**カード:** なし（共有インフラ）
**branch:** `codex/p1-i6-conformance-presentation`。`main` から分岐
**担当:** Forge
**読むもの:** [README](README.md) → `AGENTS.md` → `pipeline/p0/{validate,evaluate,present}.ts`（先例） → `docs/anti-patterns.md` の AP-002 → 本 packet

## 目的

artifact の**契約適合のみ**を判定する conformance と、**順位を一切持たない** evaluation を分けて生成し、
`normal / slow / crop / debug / still` の presentation を作る。

**conformance の pass は品質合格ではない。** これは P0 が守り抜いた境界であり、P1 でも壊さない。

## 背景（実測済み）

P0 は3つのファイルを決して混ぜない。conformance = 機構的な契約検証（存在・hash・フレーム数・fps・寸法・デコード可能性）。
evaluation = レビュー用素材と人間の観察と `knownFailureIds`。どちらも `qualityDecision: "not-assessed"` と
`representationDecision: "not-assessed"` をハードコードしている。`reviewStatus()` だけが両者を組み合わせるが、
それが作るのは**提示用ラベルであって判断ではない**。

**`debug` には P0 に生成器が1つも無い。** 前例ゼロから作る。

`slow` は P0 では `playbackRate = 0.25` の HTML 側処理であり、`derivedVideo: false` と記録されている。
**再エンコードしない。** スロー再生自体がアーティファクトを混入させないための設計判断である（`docs/p0-proof-vertical-slice.md`）。

## 承認済み範囲

- presentation set は `pipeline/p0b/comparison-contract.ts` が `normal,slow,crop,debug,still` を完全一致で要求する
- debug の内容は [p1-d0](p1-d0-owner-decisions.md) **決定8** に依存する。層1（方式非依存）は決定不要、層2（機構固有）の**横並び比較の可否**が決定8

## 依存

| 種別 | 内容 |
| --- | --- |
| 先行 packet | `p1-i2`（media）、`p1-i3`（contracts）、`p1-i5`（attempt / manifest） |
| merge 済み PR | なし |
| owner 判断 | 決定8（debug 層2 の扱い）。未決なら層2 を**個別証拠として生成し、横並びには出さない**（安全側） |

## 実装対象

```
pipeline/m3/p1/conformance.ts
pipeline/m3/p1/evaluation.ts
pipeline/m3/p1/present/index.ts
pipeline/m3/p1/present/debug-overlay.ts    ← 層1（方式非依存）
pipeline/m3/p1/*.test.ts
pipeline/m3/p1/present/*.test.ts
```

層2（機構固有 debug）は**各 render packet が自分のディレクトリに実装する**。ここでは interface だけ定義する。

## 触ってはいけないもの

- `pipeline/p0/**`、kanban、`docs/anti-patterns.md`、`package.json`、他 packet のディレクトリ

## 実装内容

### conformance（契約適合のみ）

frame 数、fps、寸法、pixel format、全フレームデコード、hash、そして
**framing ランドマークが許容差内にあること**（`p1-i3` の framing 契約）。

`pipeline/p0/contracts.ts` の `reviewStatus()` を再利用する。

### evaluation（順位を持たない）

観察、`knownFailureIds`。`qualityDecision` と `representationDecision` は `not-assessed` 固定。

**P0b との綴り差に注意。** P0 は `EvaluationStatus` を `not_evaluated`（アンダースコア）、
P0b は `not-evaluated`（ハイフン）と書く。**混ざる。** どちらを使うか決めてテストで固定する。

### presentation

| slot | 生成方法 |
| --- | --- |
| normal | 検証済み artifact をそのまま |
| slow | **再エンコードしない。** `playbackRate` で提示（P0 の判断を踏襲、`derivedVideo: false`） |
| crop | contract の crop 矩形で切り出し |
| still | contract の still フレーム |
| debug | 層1 オーバーレイ + 層2（方式固有、interface 経由） |

**debug 層1（方式非依存、全方式でピクセル同一のスタイル）:**
sequence ID、ローカル / グローバルフレーム、そのフレームを駆動している intent 制御値、
`comparison-contract.ts` の observable 参照位置、framing ランドマーク、crop 矩形。

## 受入証拠

| コマンド | 期待 |
| --- | --- |
| `npm run m3:p1-conformance` / `npm run m3:p1-present` | pass（artifact がある場合） |
| `npx vitest run pipeline/m3/p1` | pass |
| `npm run typecheck` / `npm test` | pass |

**否定テスト。** 次はすべて**落ちなければならない**。

| 検査 | なぜ必要か |
| --- | --- |
| evaluation に順位 / スコア / 順序フィールドが存在する | **型レベルと実行時の両方で**。これが最重要 |
| `conformance: pass` かつ `representationDecision !== "not-made"` | `comparison-contract.ts:109` の artifact 版 |
| フレーム数が違う artifact | P0 の negative fixture と同じ |
| 切り詰められた artifact | 同上 |
| framing ランドマークが許容差外の artifact | framing 契約の強制 |
| `fail` の artifact が normal 群に置かれる | invalid として隔離されること |
| debug 層1 のスタイルが方式ごとに違う | 比較可能性の担保 |

**debug の不変条件。** 層1・層2とも `normal` と**同じフレーム数・同じ timebase**、
**同じ制御トラック・同じ attempt** から生成され、`qualityDecision: "not-assessed"` を持つこと。

## STOP 条件

- debug 層2 の横並び可否が判断を要する（**決定8**）。安全側（個別証拠のみ）で進み報告する
- `slow` に再エンコードが必要だと判明した（P0 の判断を覆すことになる。止めて報告する）

## 非対象

- 層2（機構固有 debug）の実装 — 各 render packet の仕事
- 品質順位付け、方式採択
- render の実行

## PR 本文に書くこと

- evaluation が順位を持てないことを**どう強制したか**（型と実行時の両方）
- `not_evaluated` / `not-evaluated` の綴りをどちらに決めたか
- debug 層1 に何を載せたか、層2 の interface がどうなっているか
- 決定8 が未決の場合、安全側で進んだこと
