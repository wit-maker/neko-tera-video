# p3-template · P3 production slice（M5-00〜05）

> **これはテンプレートであり、実行可能な packet ではない。**
> `M4-08` で mi3san が P3 へ進める候補を選んでから、候補 `{P}` を代入して具体的な packet を生成する。

## 前提となる gate

**`M4-08` — mi3san が P2 の比較 presentation を見て、P3 へ進める候補を選ぶ。** agent が代行できない。

`M5-00`（production 候補と 6〜10 秒台詞 intent の固定）も owner を含む。

## P3 が P1 / P2 と違う点

P1 は機構、P2 は見た目、**P3 は「本番でこれを運用できるか」**を測る。

| 項目 | 内容 |
| --- | --- |
| 尺 | **6〜10 秒の実台詞**（T8 相当）。P1 の短い sequence とは別物 |
| 拡張 | ears / eyes / whiskers / breath / staging / camera を native asset へ拡張する |
| 出力 | **final Remotion presentation**。全フレームデコード、provenance |
| 実測 | **1回の修正コスト、rerender、compute、asset 修正手順**。推測値を入れない |

## 生成する packet の構造

候補 `{P}` の各方式 `p` について:

| packet | カード | 内容 |
| --- | --- | --- |
| `p3-extend-{p}` | M5-01 | ears / eyes / whiskers / breath / staging / camera へ asset を拡張する。**変更手順も記録する** |
| `p3-render-{p}` | M5-02 | production slice を render する。final Remotion presentation、全フレームデコード、provenance |
| `p3-cost-{p}` | M5-03 | **1回の修正 cost、rerender、compute、asset 修正手順を実測する** |

候補横断で1本ずつ:

| packet | カード | 内容 |
| --- | --- | --- |
| `p3-reviewpack` | M5-04 | quality / cost / compute / repro / operation / license を**別軸で**表示する review pack |

`M5-05`（final-selection 候補を mi3san へ提示）は Orbit の提示作業であり、判断は `M7-01` である。

## 全 P3 packet に共通する STOP 条件

| 条件 | 由来 |
| --- | --- |
| **scope が新方式の研究へ拡大した** | `M5-01`。P3 は運用検証であって探索ではない |
| render / repro failure | `M5-02` |
| **推測値だけで cost を記録した** | `M5-03`。「repeatable measurement log」が受入条件 |
| **weighted total score を作った** | `M5-04`。P1 / P2 と同じ禁止 |
| 実 artifact 無しに候補を提示した | `M5-05` |

## テンプレートを具体化するときに Orbit が埋めること

1. `{P}` — `M4-08` の決定から
2. 6〜10 秒の台詞 script、camera、output contract — `M5-00` で mi3san が固定した内容
3. `M4-08` で dropped になった候補と**その理由**

## 生成しない条件

- `M4-08` が未決
- `{P}` が空（**`M7-05` の evidence 付き no-go 経路へ**）
