# p1-c2 · 方式C adapter の P1 render（M3-05）

**カード:** `M3-05`
**branch:** `codex/p1-c2-render`。`main` から分岐
**担当:** Forge
**読むもの:** [README](README.md) → [render 共通仕様](p1-render-common.md) → [p1-c1](p1-c1-rasteriser.md) → 本 packet

## 目的

方式C（連続2Dパラメトリック）で P1 sequence をレンダーし、**`C-KF-004` を実フレームで閉じる**。

## この packet 固有の事情

### `C-KF-004` を閉じることが本体である

```
C-KF-004 (open): 層の視差は層ごとに独立適用されており、採択済みの ±15° 上限で
                 隣接層が接続を保つことを何も証明していない。T7 の layer-gap observable そのもの。
```

**T7 のフレームで、隣接層の間に隙間が生じるかを実測する。** 生じるなら、生じると記録する。
これは C の**構造的上限**でありうるので、隠さない。

### C の asset には修正余地が無い

`nativeAssetVersions` が **3 / 承認上限 2**（[p1-d0](p1-d0-owner-decisions.md) 決定7）。
**`C-KF-004` が実フレームで欠陥として現れても、この packet では直せない。**
観測し、記録し、**止めて報告する**。決定7 が未決のまま欠陥が出た場合は特にそうする。

### ネットワーク接触面がゼロかもしれない

決定4 で自前ラスタライザが選ばれた場合、C は Chrome も Blender も使わない。
**enforcement 証跡が不要になる**（決定1 の表を参照）。その場合、preflight がそれを正しく扱うことを確認する。

## 依存

[共通仕様](p1-render-common.md)に加えて:

| 種別 | 内容 |
| --- | --- |
| 先行 packet | **`p1-c1`**（ラスタライザ） |
| merge 済み PR | **PR #30**（方式C の asset） |
| enforcement 証跡 | 決定4 の結果による。自前ラスタライザなら**不要** |
| owner 判断 | 決定4（経路）、決定7（C の revision 余地）が望ましい |

## 実装対象

```
pipeline/m3/p1/c/adapter.ts
pipeline/m3/p1/c/render.ts
pipeline/m3/p1/c/debug.ts        ← 層2（機構固有）
pipeline/m3/p1/c/*.test.ts
pipeline/m3/p1/contracts/c.ts    ← 空欄を埋める
```

`pipeline/m3/p1/c/raster.ts` は `p1-c1` が作る。**再実装しない。**

## 触ってはいけないもの

[共通仕様](p1-render-common.md)に加えて:

- **`pipeline/m3/c/**`（C の asset）。** 既に 3/2 で超過している。触ればさらに超過する

## 機構固有 debug（層2）

C の機構は**連続変形とマスク**である。

- 変形後の aperture ポリゴン
- 内部層ごとのクリップ結果（可視領域を着色）
- **yaw 時の層ごとの視差オフセットベクトル** ← `C-KF-004` を測定に変える
- AP-013 の掃引由来の凸性 / 自己交差フラグ

T7 において、これが「証明していない」を「測定した」に変える。

## 受入証拠

[共通仕様](p1-render-common.md)に加えて:

| 検査 | 期待 |
| --- | --- |
| **T7 全フレームで隣接層の隙間を実測** | 数値として記録。閾値を後から緩めない |
| `occlusion-evidence.ts` の C エントリが `controlRangeSwept: true` になる | カードの本体 |
| 画像から測った遮蔽面積 ⇔ `visibleArea()` | `p1-c1` の検査3 を artifact に対しても行う |
| rest pose のフレームで内部ピクセルが 0 | 閉口の遮蔽が実フレームでも成立 |

## STOP 条件

[共通仕様](p1-render-common.md)に加えて:

- **`C-KF-004` が欠陥として現れた。** asset の修正余地が無いので、止めて報告する
- 決定4 が未決（`p1-c1` が実装されていない）

## PR 本文に書くこと

[共通仕様](p1-render-common.md)に加えて:

- **T7 の層間隙の実測値**。生じたか、生じなかったか、どの yaw 角で
- `C-KF-004` の帰結。閉じたのか、欠陥として確定したのか
- 欠陥だった場合、**asset に修正余地が無いこと**を明示して判断を求める
