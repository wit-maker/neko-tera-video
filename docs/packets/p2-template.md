# p2-template · P2 styled comparison（M4-00〜08）

> **これはテンプレートであり、実行可能な packet ではない。**
> `M3-13` で mi3san が候補を絞ってから、残存候補 `{R}` を代入して具体的な packet を生成する。
> 生成は Orbit の作業で、5分で終わる。

## なぜ今テンプレートなのか

`M3-13` で候補は必ず減る。**dropped になる方式の P2 作業を先に設計するのは無駄**である。
一方で、P2 が何を要求するかを今のうちに固定しておかないと、`M3-13` の判断材料が不足する。

だから**構造だけ**を書き、方式名は `{R}`（retained set）のままにしておく。

## 前提となる gate

**`M3-13` — mi3san が実 artifact を normal / slow / crop / debug / still と軸別 evidence で見て、
候補を retain / drop する。** agent が代行できない。

`M4-00` はその決定と Track A ceiling を固定するカードであり、これも owner を含む。

## 生成する packet の構造

残存候補 `{R}` の各方式 `r` について、次を生成する。

| packet | カード | 内容 |
| --- | --- | --- |
| `p2-brief-{r}` | M4-01 | `r` の styled native asset brief を固定する |
| `p2-asset-{r}` | M4-02 | brief に沿って `r` の Track A native asset を制作する |
| `p2-render-{r}` | M4-03 | `r` を render し全フレーム検証する |
| `p2-conformance-{r}` | M4-04 | conformance / evaluation を分離する |
| `p2-trackb-{r}` | M4-05, M4-06 | Track B cycle 1 を、target failure と追加人時を固定して実行し、継続 / 停止を failure 飽和で判定する |
| `p2-present` | M4-07 | 全候補の比較 presentation を生成する（候補横断、1本） |

`M4-08`（P3 へ進める候補の選定）は **packet 化しない。mi3san の判断である。**

## 全 P2 packet に共通する STOP 条件

`M4-01`〜`M4-06` のカード定義から。

| 条件 | 由来 |
| --- | --- |
| **同じ完成PNG / topology を全方式へ強制する要求が生じた** | `M1-04` / ADR-001 / AP-004。**P1 で最も守られてきた境界** |
| budget 超過、外部取得 | `M4-02` |
| Track B の到達品質が Track A へ混入した | `M4-05` の STOP。**公平性の根幹** |
| fixed target 無しに Track B cycle を回した | `M4-05` |
| 追加投入の根拠が無い | `M4-06` |
| conformance pass を品質合格として表示した | 全 stage 共通 |

## P2 が P1 と違う点

| 項目 | P1 | P2 |
| --- | --- | --- |
| 目的 | 機構の能力と限界を露出させる | **現行キャラクターの同一性を保った見た目**で比較する |
| asset | geometry / rig のみ。material も線も無くてよい | **identity / silhouette / fur / color / oral cavity を満たす**（ADR-001） |
| 写実化 | — | **要求しない**（ADR-001） |
| Track B | 対象外 | cycle 1 を実行し、飽和で継続 / 停止を判定 |

`D-KF-003` / `E-KF-003`（「material も線も無いので目指す2D画風をまだ示せない」）は、**P2 で閉じる**。

## テンプレートを具体化するときに Orbit が埋めること

1. `{R}` — `M3-13` の決定から
2. 各方式の Track A ceiling — `M4-00` で mi3san が固定した値
3. Track B の target failure — P1 の capability matrix で観測された failure から選ぶ
4. `M3-13` で dropped になった方式と**その理由**（P2 packet には現れないが、記録として残す）

## 生成しない条件

- `M3-13` が未決
- `{R}` が空（**全方式が drop された場合、P2 は実行しない。`M7-05` の evidence 付き no-go 経路へ**）
