# p1-i3 · 方式別 contract registry と共通 framing 契約

**カード:** なし（共有インフラ）
**branch:** `codex/p1-i3-contracts`。`main` から分岐
**担当:** Forge
**読むもの:** [README](README.md) → `AGENTS.md` → `pipeline/p0/contracts.ts`（先例） → 本 packet

## 目的

4方式の render が従う契約を、**方式別の leaf ファイル**として定義する。
比較に関わる項目（raster、crop、still、timebase、framing、presentation）は**全方式でバイト一致**し、
機構に依存する項目（renderer、camera、debug）だけが方式ごとに違う、という構造を型と検査で固定する。

leaf を先に**型付きの空欄**として作っておくことで、以降の render packet は **leaf を1つ編集するだけ**になり、
`index.ts` を触らない。これが並列実行時の衝突を消す。

## 背景（実測済み）

P0 の `pipeline/p0/contracts.ts` は方式A専用の単一 `BASELINE` 定数である。
`validate.ts` は `"60/1"` をハードコードし、`evaluate.ts` は `BASELINE.stills` と `BASELINE.crop` を直接読む。
4方式が同じ構造を共有すると、A の値が他方式へ漏れる。**方式別 leaf + 共通不変条件**に分ける必要がある。

**framing が未定義である。** C の asset 空間は 1280×1920、A の出力は 1080×1920、
D の `.blend` には**カメラが無く**、E は自前 ortho カメラを `view-pivot` に親子付けしている。
4方式が頭部を別々の位置に置けば、共通 crop 矩形は比較として意味を失う。

## 承認済み範囲

- view 範囲 yaw ±15° / pitch ±10° は ADR-001 / GOV-013 で採択済み
- budget は `pipeline/m3/p1-track-a-run-definition.json` から**読む**。数値を書き写さない
- framing 契約の具体値（ランドマーク位置と許容差）は**この packet が起案する**。[p1-d0](p1-d0-owner-decisions.md) 決定5 に依存する

## 依存

| 種別 | 内容 |
| --- | --- |
| 先行 packet | `p1-i1`（sequence と still 宣言）、`p1-i2`（timebase 型） |
| merge 済み PR | なし |
| owner 判断 | 決定3（フレーム構成）、決定5（framing / カメラ非対称）。**未決なら仮値を置き、`status` に明記して報告する** |

## 実装対象

```
pipeline/m3/p1/contracts/index.ts     ← ここで完成させる。render packet は触らない
pipeline/m3/p1/contracts/types.ts
pipeline/m3/p1/contracts/a.ts         ← 型付きの空欄。p1-a が埋める
pipeline/m3/p1/contracts/c.ts         ← 型付きの空欄。p1-c2 が埋める
pipeline/m3/p1/contracts/d.ts         ← 型付きの空欄。p1-d が埋める
pipeline/m3/p1/contracts/e.ts         ← 型付きの空欄。p1-e が埋める
pipeline/m3/p1/contracts/validate.ts  （CLI）
pipeline/m3/p1/contracts/contracts.test.ts
```

## 触ってはいけないもの

- `pipeline/p0/contracts.ts` — P0a の証跡が blob 固定されている
- kanban、`docs/anti-patterns.md`、`package.json`、他 packet のディレクトリ

## 実装内容

### 契約の形

```
{
  base,
  sequenceIds,            // p1-i1 から
  timebase,               // p1-i2 の型
  raster:   { width, height, pixelFormat, primaries, transfer, matrix, range },
  alpha,
  framing:  { landmarks: [{ id, x, y }], tolerancePx },
  camera:   { projection, yawLimitDegrees, pitchLimitDegrees, authoredIn: "asset" | "comparison" },
  crop:     { x, y, width, height, displayWidth, displayHeight },
  stills:   number[],
  presentation: ["normal","slow","crop","debug","still"],
  renderer: { name, version, executablePath, antiAliasing, samples, seed },
  debugPass:{ mechanism, contents: string[] },
}
```

budget は**この構造に入れない**。`p1-track-a-run-definition.json` を読む関数を提供する。

### 共通・方式固有の切り分け

| 全方式でバイト一致 | 方式ごとに違ってよい |
| --- | --- |
| `raster`、`crop`、`stills`、`timebase`、`framing`、`presentation`、`sequenceIds`（core 4方式） | `renderer`、`camera.authoredIn`、`debugPass` |

`camera.authoredIn` が `"asset"` になれるのは **E だけ**である（`M3-08` のカード要求がそれを求めた）。
ただし E も **framing ランドマークは他方式と同じ位置に落ちなければならない**。

## 受入証拠

| コマンド | 期待 |
| --- | --- |
| `npm run m3:validate-p1-contracts` | pass |
| `npx vitest run pipeline/m3/p1/contracts` | pass |
| `npm run typecheck` / `npm test` | pass |

**不変条件テスト（この packet の要）。**

| 検査 | なぜ必要か |
| --- | --- |
| `raster` / `crop` / `stills` / `timebase` / `framing` / `presentation` が A/C/D/E で**バイト一致** | 一致しなければ比較が成立しない |
| `camera.authoredIn === "asset"` は E のみ許可 | 他方式が勝手に asset 側カメラへ移行しない |
| E の framing ランドマークが他方式と同一許容差内 | 自前カメラでも共通 crop が成立する |
| `presentation` が `normal,slow,crop,debug,still` と完全一致 | `pipeline/p0b/comparison-contract.ts` の要求 |
| budget が JSON から**読まれている** | 書き写した数値は必ず乖離する |
| 契約のどのフィールドも rank / score / decision を持たない | 型レベルと実行時の両方で |

**否定テスト。** 次はすべて**落ちなければならない**。

- ある方式の `crop` を 1px ずらした registry
- `camera.authoredIn: "asset"` を D に設定した registry
- `presentation` の順序を入れ替えた registry
- budget 数値を leaf に直接書いた registry
- `qualityRank` のようなフィールドを足した registry

## STOP 条件

- framing ランドマークが、ある方式で許容差内に収まらないと判明した場合（**決定5 が必要**）
- 総フレーム数が決まらないと契約が書けない場合（**決定3 が必要**）。仮値で進み明記して報告する

## 非対象

- leaf の中身を埋めること（それは各 render packet の仕事）
- render の実行
- 品質順位付け、方式採択

## PR 本文に書くこと

- framing ランドマークの選択と、なぜその点か
- 決定3 / 決定5 が未決の場合、どこに仮値を置いたか
- leaf の空欄が型でどう強制されているか（埋め忘れがコンパイルエラーになるか）
