# p1-i1 · P1 比較 sequence の機械可読定義

**カード:** なし（`M3-00` の run definition が sequence **ID** を固定したが、その**中身**はどこにも無い）
**branch:** `codex/p1-i1-sequence`。`main` から分岐
**担当:** Forge
**読むもの:** [README](README.md) → `AGENTS.md` → `docs/character-architecture-strategy.md` §10（比較sequence） → 本 packet

## 目的

`T0/T1/T3/T6/T7/T9` を、**方式に依存しない制御トラック**として1箇所に定義する。
4方式の render が同じトラックを読むことで、比較が「方式差」を測る。トラックが無ければ各セッションが
タイミングを発明し、比較は「作画差」を測ってしまう。

## なぜこの packet が最初か

sequence は `docs/character-architecture-strategy.md` の**散文の意図表**としてしか存在しない。
制御値もフレーム数も無い。そして `finalRenderAttemptsMax` は 2 なので、**候補あたり実質1発**である。
sequence が悪いと判明する頃には試行を使い切っている。

**実装リスクは低いが帰結が最も重い packet である。**

## 承認済み範囲

- sequence **ID** の集合は `pipeline/m3/p1-track-a-run-definition.json` の `candidates[].sequenceIds` で固定済み。core 4方式は `T0,T1,T3,T6,T7,T9`、B2 は `T1,T3,T8`
- view 範囲は ADR-001 / GOV-013 で yaw ±15°、pitch ±10°
- **sequence の中身（フレーム数と制御値）は未承認。** この packet は起案であり、mi3san の承認（[p1-d0](p1-d0-owner-decisions.md) 決定2）を経てから render に使う
- artifact の総フレーム数は [p1-d0](p1-d0-owner-decisions.md) **決定3 に依存する**。決定前は 619 フレーム1本を仮に採り、決定で変わりうることを JSON の `status` に明記する

## 依存

| 種別 | 内容 |
| --- | --- |
| 先行 packet | なし。`p1-i2` と並行してよい |
| merge 済み PR | なし |
| owner 判断 | 決定3（フレーム構成）が未定でも着手可。決定2（承認）は render 前に必要 |

## 実装対象

```
pipeline/m3/p1/sequence.ts
pipeline/m3/p1/p1-sequences.json
pipeline/m3/p1/sequence.test.ts
pipeline/m3/p1/validate-sequence.ts   （CLI）
```

**このディレクトリ直下のこの4ファイルだけ。** `pipeline/m3/p1/contracts/` や `preflight/` には入らない。

## 触ってはいけないもの

- kanban、`docs/anti-patterns.md`、他 packet のディレクトリ
- `package.json` — **ただしこの packet だけは例外**。後述

## package.json の扱い（この packet の特殊責務）

衝突源を先に潰すため、**P1 の npm script をここで全部追加する。**

```
"m3:validate-p1-sequence":    "tsx pipeline/m3/p1/validate-sequence.ts"
"m3:validate-p1-contracts":   "tsx pipeline/m3/p1/contracts/validate.ts"
"m3:p1-preflight":            "tsx pipeline/m3/p1/preflight/check.ts"
"m3:render-p1-a":             "tsx pipeline/m3/p1/a/render.ts"
"m3:render-p1-c":             "tsx pipeline/m3/p1/c/render.ts"
"m3:render-p1-d":             "tsx pipeline/m3/p1/d/render.ts"
"m3:render-p1-e":             "tsx pipeline/m3/p1/e/render.ts"
"m3:p1-conformance":          "tsx pipeline/m3/p1/conformance.ts"
"m3:p1-present":              "tsx pipeline/m3/p1/present/index.ts"
"m3:p1-capability-matrix":    "tsx pipeline/m3/p1/matrix.ts"
```

存在しないファイルを指す script は、その packet が来るまで**失敗するだけで無害**である。
これにより以降の packet は `package.json` を一切触らない。PR 本文に「未実装の script を先行追加した」と明記する。

## 実装内容

### 制御語彙

方式Cの `pipeline/m3/c/deform.ts` の `CNativeControls` と**同じ語彙**を使う。C が既に定義しており、
D/E の rig もこれに対応づけられる。ただし **C の型を import しない**（C は1方式であり、共通語彙が
1方式に従属してはならない）。同じ名前で独立に定義し、テストで整合を確認する。

```
jawOpen, lipCornerPull, lipCornerAsymmetry, muzzleRound,
cheekPuff, tongueRaise, yawDegrees, pitchDegrees, breath, blink
```

### JSON の形

各 sequence は ID・フレーム区間・キーフレーム列を持つ。フレームごとの値は補間で導出する。
補間方式（linear / ease）は宣言し、テストで固定する。

still フレームは**ここで一度だけ宣言する**。方式ごとに別々に決めさせない。

### 各 sequence の意図（戦略文書 §10 より）

| ID | Intent | このトラックが露出させるもの |
| --- | --- | --- |
| T0 | neutral hold | 同一性、静止時の noise / drift |
| T1 | opening ramp | 顔下部の連動、口腔、volume |
| T3 | open 中の closure | 接触、歯の隠れ、occlusion |
| T6 | 二軸 combination sweep | 組合せ破綻、補正不足 |
| T7 | yaw ±15° / pitch ±10° 内の動作 | view 依存、layer gap、volume |
| T9 | 速度変化・hold・方向反転 | temporal continuity、overshoot、flicker |

## 受入証拠

| コマンド | 期待 |
| --- | --- |
| `npm run m3:validate-p1-sequence` | pass |
| `npx vitest run pipeline/m3/p1/sequence` | pass |
| `npm run typecheck` / `npm test` | pass |

**構造テスト（これが本体）。**

| 検査 | なぜ必要か |
| --- | --- |
| yaw / pitch が**全フレームで** ±15 / ±10 内 | **端点だけの検査は AP-013 を再発させる。** C の欠陥2件はどちらも承認済み範囲の**内側**にあった |
| T3 が開口区間の**内側**に閉鎖を含む | 端で閉じるだけでは「open中のclosure」にならない |
| T9 が hold と方向反転の**両方**を含む | どちらか一方では temporal continuity を露出させない |
| T6 が二軸を**同時に**動かす | 順番に動かすと組合せ破綻が出ない |
| 全 sequence のフレーム合計が宣言した総フレーム数と一致 | 未定義フレームを残さない |
| 補間が連続（隣接フレームの階差に上限） | 離散的な跳びを混入させない |
| 決定的 — 同じ入力で同じ出力 | |

**否定テスト。** 次はすべて**落ちなければならない**。

- yaw が範囲内の**中間フレームだけ**で ±15 を超える track
- T3 の閉鎖が区間の端にある track
- T9 が hold のみ、または反転のみの track
- T6 が二軸を順番に動かす track
- フレーム区間に隙間がある track

## STOP 条件

- **ある sequence が、どれかの方式が表現できない制御を必要とする場合。** これは owner の判断である。run definition は sequence の **ID** を固定したのであって中身ではない
- 総フレーム数の決定（[p1-d0](p1-d0-owner-decisions.md) 決定3）が必要になった場合。仮値で進み、JSON に明記して報告する

## 非対象

- render の実行
- 方式別の値の調整（sequence は方式非依存でなければならない）
- 品質順位付け、方式採択

## PR 本文に書くこと

- 各 sequence が何フレームを占め、なぜその長さかの根拠
- 補間方式の選択と理由
- **未実装の npm script を先行追加したこと**とその理由
- 総フレーム数が決定3に依存すること
- mi3san の承認（決定2）が render 前に必要であること
