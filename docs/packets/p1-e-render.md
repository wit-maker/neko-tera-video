# p1-e · 方式E adapter の P1 render（M3-09）

**カード:** `M3-09`
**branch:** `codex/p1-e-render`。`main` から分岐
**担当:** Forge
**読むもの:** [README](README.md) → [render 共通仕様](p1-render-common.md) → [p1-d](p1-d-render.md)（同じ Blender 経路） → `pipeline/m3/e/` → 本 packet

## 目的

方式E（完全3D rig）で P1 sequence を Blender headless でレンダーし、
**`E-KF-004` と `E-KF-001` を実フレームで測る**。

Blender 経路の注意事項は [p1-d](p1-d-render.md) と共通である（再取得しない、Cycles / GPU を使わない、
マテリアルを足さない、`.blend` を触らない）。ここでは **E 固有の事情**だけを書く。

## この packet 固有の事情

### `E-KF-004` を閉じることが本体である

```
E-KF-004 (open): view 制限は constraint として作画済みだが、
                 その範囲で幾何が保つ保証は無い。yaw ±15° のフレームが1枚も無い。
```

E は **camera / view behavior を asset 側に持つ唯一の方式**である（`M3-08` のカード要求）。
`view-pivot` に limit-rotation constraint（yaw ±15° / pitch ±10°）が付いた ortho カメラが親子付けされている。

**その範囲を実際に動かして、幾何が保つかを測る。**

### E は自前カメラを使う — ただし共通 framing に落ちること

D は render 側からカメラを与えるが、**E は asset 側のカメラを使う**。
これは非対称だが `M3-08` のカード要求そのものであり、正しい。

**ただし** contract の framing ランドマークは他方式と**同一許容差内**に落ちなければならない
（[p1-d0](p1-d0-owner-decisions.md) 決定⑥、`p1-i3` の不変条件）。落ちなければ共通 crop が成立せず、
crop presentation が比較でなくなる。

### `E-KF-002` を「解剖学的にくり抜いた」と書かない

```
E-KF-002 (open): 口腔は boolean でくり抜いた内部ではなく、頭部内部に置いた閉じた楕円体。
                 内部空間は持つが、口は頭部表面を貫通した開口ではない。
```

実フレームで口腔がどう見えるかは、この構造の帰結である。**構造を正しく説明した上で観察を記録する。**

### `E-KF-001` も観測対象である

```
E-KF-001 (open): volume の結合が一律 weight 1.0。
                 顎回転時に隣接 volume が相互貫入または分離する。
```

貫入するなら、**貫入すると記録する**。

## 依存

[共通仕様](p1-render-common.md)に加えて:

| 種別 | 内容 |
| --- | --- |
| merge 済み PR | **PR #36**（方式E の asset）。**PR #35 が先に merge されている必要がある** |
| enforcement 証跡 | **`blender.exe`**（決定①）。`M3-01` provision の 4.5.0。**Blender 5.2 ではない** |
| owner 判断 | なし。**決定⑥ は Orbit 決定済み** — E の自前カメラも共通 framing ランドマークへ落とす |

## 実装対象

```
pipeline/m3/p1/e/adapter.ts
pipeline/m3/p1/e/render.ts
pipeline/m3/p1/e/render_frames.py   ← Blender 側スクリプト
pipeline/m3/p1/e/debug.ts           ← 層2（機構固有）
pipeline/m3/p1/e/*.test.ts
pipeline/m3/p1/contracts/e.ts       ← 空欄を埋める。`camera.authoredIn: "asset"` を設定できる唯一の leaf
```

## 触ってはいけないもの

[共通仕様](p1-render-common.md)に加えて:

- **`pipeline/m3/e/build_asset.py` と `.blend`。** asset の変更は revision を消費する（E は 1/2 使用済み、残り1）
- 他方式の leaf。特に `camera.authoredIn: "asset"` を D へ設定しない

## 機構固有 debug（層2）

- **フレームごとの、内部 volume × skull 評価済み境界の内包判定** ← `E-KF-004` を測定に変える
- pivot の yaw / pitch 読み値
- **隣接 volume 間の貫入** ← `E-KF-001`

## 受入証拠

[共通仕様](p1-render-common.md)に加えて:

| 検査 | 期待 |
| --- | --- |
| **yaw ±15° / pitch ±10° の全域で内包が保たれるかを実測** | rest pose だけではない |
| `occlusion-evidence.ts` の E エントリが `controlRangeSwept: true` になる | カードの本体 |
| **E の framing ランドマークが他方式と同一許容差内** | 自前カメラでも共通 crop が成立すること |
| `camera.authoredIn === "asset"` が E の leaf にのみ設定されている | `p1-i3` の不変条件 |
| 2回目の render でバイト一致 / `.blend` hash 不変 / add-on 0件 | [p1-d](p1-d-render.md) と同じ |
| 隣接 volume の貫入を大開口フレームで測定 | `E-KF-001` |

## STOP 条件

[共通仕様](p1-render-common.md)に加えて:

- **view 範囲内で内包が破れるフレームが見つかった。** asset の修正は revision を消費する。止めて報告する
- **E の framing が共通許容差に落ちない。** 設計の見直しが要る。**カメラを勝手に変えない。止めて報告する**
- Blender が見つからない（**再取得しない**）

## PR 本文に書くこと

[共通仕様](p1-render-common.md)に加えて:

- **view 全域で内包が保たれたか。** 破れたなら、どの角度・どの volume で
- E の framing ランドマークの実測位置と、他方式との差
- 隣接 volume の貫入の有無
- `E-KF-002`（口腔が貫通開口でないこと）が実フレームでどう見えたか
