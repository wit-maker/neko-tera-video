# Task packets

各 packet は、**この会話の文脈を持たない新しいセッションが単独で実行できる**単位の作業仕様である。
Orbit（PM）が分割して書き、実装セッションが読んで実行する。

正本はここではない。カードの状態は [kanban](../character-expression-program-kanban.md)、
判断状態は [governance](../architecture-governance.md)、採択済み境界は [ADR-001](../adr/001-next-character-comparison-boundaries.md) にある。
packet はそれらを**参照**するのであって、内容を複製しない。

## 実行規約

着手前に必ず読む。`AGENTS.md` の「着手前の必読」に加えて、packet 実行者には次が課される。

1. **`main` から分岐する。積まない。** branch 名は packet が指定するものを使う。
2. **触ってよいディレクトリは packet が指定した1つだけ。** 他 packet の領域に入らない。
3. **[kanban](../character-expression-program-kanban.md) を編集しない。** カードの状態遷移は PR 本文に書き、盤面の更新は Orbit が merge 波ごとにまとめて行う。これが過去に8本のPRで最大の衝突源になった。
4. **[anti-patterns.md](../anti-patterns.md) へ勝手に追記しない。** 記録すべき失敗を観測したら、AP番号の払い出しを Orbit へ要求する。台帳は追記専用で、複数セッションの同時追記は必ず衝突する。
5. **`package.json` を編集しない。** P1 の npm script は `p1-i1` が先にまとめて追加する。存在しないファイルを指す script はその packet が来るまで失敗するだけで、無害である。
6. **budget の数値を書き写さない。** `pipeline/m3/p1-track-a-run-definition.json` から読む。写した数値は必ず本体と乖離する。
7. **単体テストからホストの外部ツールを起動しない。** ffmpeg / ffprobe / Blender などを実際に呼ぶテストは、手元では通り **CI では落ちる**（AP-015）。実行部分は注入可能にし、テストは argv の構築を検査する。
8. **走査型の検査には、走査件数の下限と違反fixtureを付ける。** 走査対象が0件でも「違反0件」と同じ結果になり、**通っているのに何も見ていない**状態を作る（AP-014）。
9. **STOP に該当したら止めて報告する。** 超過を吸収しない。判断を代行しない。

## 禁止事項（全 packet 共通）

`pipeline/m3/p1-track-a-run-definition.json` の `m300ExecutionProhibitions` と `AGENTS.md` に従う。

- firewall rule その他のホストセキュリティ設定の変更
- Blender add-on のインストール、新規 dependency の追加
- cloud / 有料サービスの利用
- 承認済み範囲外の外部取得（Blender は `M3-01` で `downloadCount: 1` として承認済み。**見つからなくても再取得しない**）
- 品質順位付け、方式採択、`representationDecision` の記入
- `conformance: pass` を品質合格として提示すること

## 再利用する既存資産

再実装しないこと。

| 資産 | 内容 | 注意 |
| --- | --- | --- |
| `pipeline/p0/lib.ts` | `sha256`（**大文字hex**）、`run`（Windows `.cmd` shim込み）、`readJson` / `writeJson`、`pathFromRoot`、`argValue`、`requireFile` | `writeJson` は `JSON.stringify(v, null, 2)` + **末尾改行**。再現しないと artifact hash がずれる |
| `pipeline/m3/blender.ts` | `M3-01` Blender の解決、archive SHA-256 検証 | `PATH` を見ない。見つからなければ**例外を投げる**。ダウンロードするコードを足さない |
| `pipeline/m3/occlusion-evidence.ts` | 方式横断の遮蔽証拠受入条件（AP-010/012/013の昇格先） | 遮蔽を主張する packet は `validateOcclusionEvidence()` を通す |
| `pipeline/p0b/comparison-contract.ts` | `validateP0bContract()`、artifact contract | timebase は `{fps:60, startFrame:0, endFrameExclusive:619}` 固定 |
| `pipeline/p0/contracts.ts` | `reviewStatus()`、conformance/evaluation 分離の先例 | `EvaluationStatus` の綴りが P0 は `not_evaluated`、P0b は `not-evaluated`。**混ざる** |
| `pipeline/m3/network/enforcement.ts` | render 前 enforcement 証跡の分類（PR #33） | 証跡の記録は許可の付与ではない |

## packet 一覧と依存

```
W0  p1-d0-owner-decisions ──────────────────────┐
W1  p1-i1 ‖ p1-i2 → p1-i3 → p1-i4 ‖ p1-i5 → p1-i6│
W2  p1-a ‖ (p1-c1 → p1-c2) ‖ p1-d ‖ p1-e  ◄─────┘
W3  p1-m（M3-12）+ M1-04〜06
W4  ★ M3-13 — mi3san が実映像で候補を絞る
W5  p2-template を残存候補で具体化
W6  ★ M4-08 — P3 へ進める候補を mi3san が選ぶ
W7  p3-template を具体化
W8  ★ M7-01 最終選定 → m7-m8-closure
```

★ は agent が代行できない。`AGENTS.md` が「agentの自動採択は不可」と明記している。

**W1 は W0 と並行して着手できる。** インフラは render を実行しないため、owner 判断を待たない。

| packet | カード | 依存 |
| --- | --- | --- |
| [p1-d0](p1-d0-owner-decisions.md) | — | なし。**最優先**。mi3san 判断4件と Orbit 決定4件を分けて記載 |
| [p1-i1](p1-i1-sequence.md) | — | なし |
| [p1-i2](p1-i2-media.md) | — | なし |
| [p1-i3](p1-i3-contracts.md) | — | i1, i2 |
| [p1-i4](p1-i4-preflight.md) | — | i3、**PR #33 merge済** |
| [p1-i5](p1-i5-attempt-manifest.md) | — | i2, i3 |
| [p1-i6](p1-i6-conformance-presentation.md) | — | i2, i3, i5 |
| [p1-a](p1-a-render.md) | M3-02 | i1–i6, d0, `chrome-headless-shell.exe` の enforcement 証跡 |
| [p1-c1](p1-c1-rasteriser.md) | — | i2, i3。**d0 前に着手可** |
| [p1-c2](p1-c2-render.md) | M3-05 | c1, i1–i6, **PR #30 merge済** |
| [p1-d](p1-d-render.md) | M3-07 | i1–i6, **PR #35 merge済**, `blender.exe` の enforcement 証跡 |
| [p1-e](p1-e-render.md) | M3-09 | i1–i6, **PR #36 merge済**（#35 が先）, `blender.exe` の enforcement 証跡 |
| [p1-m](p1-m-capability-matrix.md) | M3-12 | render 4件, PR #31, #32, #37 |
| [p2-template](p2-template.md) | M4-00〜08 | ★ M3-13 |
| [p3-template](p3-template.md) | M5-00〜05 | ★ M4-08 |
| [m7-m8](m7-m8-closure.md) | M7, M8 | ★ M7-01 |

## この文書が承認するもの

何も承認しない。packet は作業の**分割**であって、範囲の**拡大**ではない。
承認済み範囲は `M3-03`（Track A 上限）と `M3-01`（Blender 取得）と ADR-001（比較境界）にあり、
packet がそれを広げることはできない。
