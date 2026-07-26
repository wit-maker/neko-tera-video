# p1-d · 方式D adapter の P1 render（M3-07）

**カード:** `M3-07`
**branch:** `codex/p1-d-render`。`main` から分岐
**担当:** Forge
**読むもの:** [README](README.md) → [render 共通仕様](p1-render-common.md) → `pipeline/m3/d/` → 本 packet

## 目的

方式D（2.5D 解剖 rig）で P1 sequence を Blender headless でレンダーし、
**`D-KF-002` と `D-KF-001` を実フレームで測る**。

## この packet 固有の事情

### `D-KF-002` を閉じることが本体である

```
D-KF-002 (open): 深度順序は rest pose の静的性質としてのみ検証済み。
                 顎回転や yaw ±15° で順序が保たれる保証は無い。T7 observable そのもの。
```

D の遮蔽主張は「幾何的な深度順序」である。**顎が回った後もそれが保たれるかは未検証**であり、
それを測るのがこのカードである。**フレームごとに、内部4層 × 遮蔽2層の深度差と画面重なりを測る。**

### `D-KF-001` も観測対象である

```
D-KF-001 (open): plate の結合が falloff ではなく一律 weight 1.0。
                 顎を大きく開いたとき隣接 plate が分離する可能性がある。
```

分離するなら、**分離すると記録する**。一律結合は「auto-weighting のヒューリスティックを比較の隠れ変数にしない」
という意図的な選択であり、その代償がここで見える。

### `.blend` にカメラが無い

`pipeline/m3/d/build_asset.py` は camera を作っていない。**比較カメラは render 側で与える**
（[p1-d0](p1-d0-owner-decisions.md) 決定5）。framing ランドマークが contract の許容差内に落ちることを conformance で確認する。

### ライトもマテリアルも足さない

```
D-KF-003 (open): geometry と rig 構造のみ。material / texture / 線 / groom が無い。
```

**これは正しい状態である。** 見た目の作り込みは **P2 の作業**であり、
ここで足すと **`nativeAssetRevisions` を未予算で消費する**（D は 1/2 使用済み、残り1）。

**Workbench エンジン、CPU、サンプル数と seed を固定した clay render** が、機構証拠として正直な出力である。
**Cycles と GPU は使わない**（非決定的）。

### Blender を再取得しない

`pipeline/m3/blender.ts` の `resolveBlender()` は、見つからなければ**例外を投げる**。
`M3-01` の承認は `downloadCount: 1` である。**「見つからないので落としてくる」実装を足すことが、この packet の失敗である。**

## 依存

[共通仕様](p1-render-common.md)に加えて:

| 種別 | 内容 |
| --- | --- |
| merge 済み PR | **PR #35**（方式D の asset） |
| enforcement 証跡 | **`blender.exe`**（決定1）。`M3-01` provision の 4.5.0 の方。**Blender 5.2 ではない** |
| owner 判断 | 決定5（カメラ / framing） |

## 実装対象

```
pipeline/m3/p1/d/adapter.ts
pipeline/m3/p1/d/render.ts
pipeline/m3/p1/d/render_frames.py   ← Blender 側スクリプト
pipeline/m3/p1/d/debug.ts           ← 層2（機構固有）
pipeline/m3/p1/d/*.test.ts
pipeline/m3/p1/contracts/d.ts       ← 空欄を埋める
```

## 触ってはいけないもの

[共通仕様](p1-render-common.md)に加えて:

- **`pipeline/m3/d/build_asset.py` と `.blend`。** asset の変更は revision を消費する

## 機構固有 debug（層2）

- plate の深度順を番号付きスタックで
- **フレームごとの、内部 / 遮蔽 対ごとの深度差**（manifest は rest pose のみ、最小 0.044）
- 画面空間の重なり
- **順序が反転したフレームのハイライト** ← `D-KF-002` を測定に変える

## 受入証拠

[共通仕様](p1-render-common.md)に加えて:

| 検査 | 期待 |
| --- | --- |
| **全フレームで深度順序と画面重なりを実測** | rest pose だけではない |
| `occlusion-evidence.ts` の D エントリが `controlRangeSwept: true` になる | カードの本体 |
| **2回目の render でバイト一致** | Cycles / GPU を使っていないことの実証 |
| `.blend` の SHA-256 が render 前後で**不変** | asset を触っていないこと |
| `addonsInstalledByThisTask: []` が空のまま | |
| contract の `renderer{name, samples, seed}` が記録され assert されている | |
| 隣接 plate の分離を T1 / T3 の大開口フレームで測定 | `D-KF-001` |

## STOP 条件

[共通仕様](p1-render-common.md)に加えて:

- **深度順序が反転するフレームが見つかった。** asset の修正は revision を消費する。止めて報告する
- Blender が見つからない（**再取得しない**）
- 決定性が出ない（**Cycles / GPU を使っていないか確認する**）

## PR 本文に書くこと

[共通仕様](p1-render-common.md)に加えて:

- **深度順序が全フレームで保たれたか。** 反転したなら、どのフレーム・どの対で
- 隣接 plate の分離の有無と、生じた開口量
- 使用した engine / samples / seed
- 2回目 render のバイト一致確認と、`.blend` hash の不変確認
