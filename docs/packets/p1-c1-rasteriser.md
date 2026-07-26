# p1-c1 · 方式C ラスタライザ

**カード:** なし（`M3-05` の前提。分割して単独レビュー可能にした）
**branch:** `codex/p1-c1-rasteriser`。`main` から分岐
**担当:** Forge
**読むもの:** [README](README.md) → `AGENTS.md` → **`docs/anti-patterns.md` の AP-012 / AP-013** → `pipeline/m3/c/{asset,deform}.ts` → 本 packet

## ⚠️ この packet は波の中で2番目に危険である

**もっともらしい絵を出しながら、静かに壊れる。** AA を勝手に掛ける、ガンマを潰す、`clipBy` を落とす。
どれも「絵が出た」ことでは検出できない。

**最強の検査は、画像から測った遮蔽面積を `deform.ts` の `visibleArea()` と照合することである。**
これは AP-012 が要求する「独立に実装した基準との絶対値照合」そのものであり、
**画像側と幾何側という2つの独立実装**の突き合わせになる。

## 目的

`pipeline/m3/c/deform.ts` の `evaluate(controls)` が返す変形済みケージを、contract raster の PNG にする。

## 依存

| 種別 | 内容 |
| --- | --- |
| 先行 packet | `p1-i2`（media）、`p1-i3`（contracts） |
| merge 済み PR | **PR #30**（方式C の asset）。ただし `deform.ts` の API を読むだけなら未 merge でも設計できる |
| owner 判断 | **決定4**（ラスタライズ経路と cage 補間）。**未決なら着手しない** |

**artifact を出さないので、決定1（M3-14）を待たずに着手できる。** これが W2 で最も早く始められる理由である。

## 承認済み範囲

- 新規 dependency は**不可**。走査線塗りを手で書く
- 決定4 で「自前ラスタライザ」が選ばれた場合のみ、この packet が有効になる。
  「Remotion / Chrome SVG」が選ばれた場合、この packet は**破棄**し `p1-c2` が Remotion 経路で実装する

## 実装対象

```
pipeline/m3/p1/c/raster.ts
pipeline/m3/p1/c/raster.test.ts
```

## 触ってはいけないもの

- **`pipeline/m3/c/**` を変更しない。** C の asset は `nativeAssetVersions` が **3 / 承認上限 2** で、
  既に超過している（[p1-d0](p1-d0-owner-decisions.md) 決定7）。**触れば さらに超過する**
- kanban、`docs/anti-patterns.md`、`package.json`、他 packet のディレクトリ

## 実装内容

- `evaluate(controls)` の返す層を `drawOrder` 順に塗る
- `clipBy` を持つ層は、そのマスクでクリップする。**`deform.ts` の `intersectionArea` と同じ幾何解釈**を使う
- cage の補間方式は**決定4 に従う**。多角形塗りかスプラインか。**packet の中で黙って決めない**
- AA と色処理を**明示的に宣言する**。contract の `renderer{antiAliasing, samples, seed}` に記録する

## 受入証拠

| コマンド | 期待 |
| --- | --- |
| `npx vitest run pipeline/m3/p1/c/raster` | pass |
| `npm run typecheck` / `npm test` | pass |

### 必須テスト（この packet の本体）

| # | 検査 | なぜ必要か |
| --- | --- | --- |
| 1 | **ピクセル厳密** — 既知の矩形を既知の位置に置くと、正確なピクセル数になる | AA やオフセットの静かな混入を捕まえる |
| 2 | **rest pose で内部ピクセルが 0** | `C_ASSET_STATUS` の要点そのもの。閉じた口は面積ゼロを囲む。**1ピクセルでも漏れたら遮蔽が壊れている** |
| 3 | **画像から測った遮蔽面積 ⇔ `visibleArea()`**（許容差を明示） | **最重要。** AP-012 の意味での独立相互検証。画像側と幾何側が食い違えばどちらかが壊れている |
| 4 | **2回目の実行でバイト一致** | 決定性 |
| 5 | `clipBy` を無視した実装が**落ちる** | 落とし忘れの検出 |
| 6 | `drawOrder` を入れ替えると**落ちる** | 描画順の強制 |

### 否定テスト

- `clipBy` を無視した層で内部が露出する fixture → **落ちる**
- rest pose で内部ピクセルが 1 以上ある fixture → **落ちる**
- 幾何側と画像側の面積が許容差を超えて食い違う fixture → **落ちる**

## STOP 条件

- 決定4 が未決（**着手しない**）
- 新規 dependency が必要になった
- 検査3（画像 ⇔ 幾何）が通らない。**どちらが壊れているか切り分けて報告する。
  合わせるために許容差を緩めない**

## 非対象

- C の asset（`pipeline/m3/c/**`）の変更
- render の実行、artifact の生成（それは `p1-c2`）
- 品質順位付け、方式採択

## PR 本文に書くこと

- 決定4 のどちらを実装したか
- AA / 色処理の宣言内容
- **検査3 の実測値と許容差、そして許容差をその値にした根拠**
- 補間方式が C の宣言された機構の一部になること（レビュアーがラスタライザの選択を「C の品質上限」と読まないように）
