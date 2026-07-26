# p1-a · 方式A adapter の P1 render（M3-02）

**カード:** `M3-02`
**branch:** `codex/p1-a-render`。`main` から分岐
**担当:** Forge
**読むもの:** [README](README.md) → [render 共通仕様](p1-render-common.md) → `AGENTS.md` → 本 packet

## 目的

現行方式A（局所口パッチ）で P1 sequence をレンダーし、**P0a との差分を provenance で明示する**。
A は「現行の最低基準と既知 failure」を与える baseline であり、他方式を読むための基準線である。

## この packet 固有の事情

### `src/Root.tsx` を触る唯一の packet である

A は Remotion でレンダーする。**それは境界違反ではなく、A の機構そのものである**
（戦略文書 §15 / GOV-010 は「adapter がレンダーし、Remotion は検証済み artifact を提示する」と定めるが、
A の場合 Remotion / React 合成が評価対象の機構である）。

P1 sequence 用の composition 登録が必要であり、それは `src/Root.tsx` の編集を意味する。
`p1-i4` が用意した **P1-A policy** がこれを受理する（`src/Main.tsx` への無関係な編集は拒否する）。
**`pipeline/p0/**` の policy は変えない。**

### P0a を**パスではなく SHA-256 で解決する**

`out/p0` は**この checkout に存在しない**（別の working copy にある。Blender provision と同じ状況）。
P0a artifact は SHA-256 で同定する。

```
6353866D986A2C70E5956EAC0C6B3CA22DD686592C51CFFBB77FB64039BDA561
```

`pipeline/m3/blender.ts` が確立した作法と同じ — **パスではなく identity で解決する**。

### P0a の artifact を P1-A として流用しない

**これがこの packet で最も起きやすい誤りである。**

P0a は s7c6 の台詞クリップ 619 フレームである。P1-A は **T sequence** である。**内容が違う。**

| 検査 | 期待 |
| --- | --- |
| P1-A artifact の SHA-256 | `6353866D…` と**異なる** |
| still フレーム | **sequence が宣言したフレーム**。P0 の 0 / 309 / 618 ではない |
| manifest | 両方の hash を記録し、**差分の理由を述べる** |

## 依存

[共通仕様](p1-render-common.md)に加えて:

| 種別 | 内容 |
| --- | --- |
| enforcement 証跡 | **`chrome-headless-shell.exe`**（決定①） |
| 承認済み範囲 | budget は `p1-track-a-run-definition.json` の `candidates[base=A]` |

## 実装対象

```
pipeline/m3/p1/a/adapter.ts
pipeline/m3/p1/a/render.ts
pipeline/m3/p1/a/debug.ts        ← 層2（機構固有）
pipeline/m3/p1/a/*.test.ts
pipeline/m3/p1/contracts/a.ts    ← 空欄を埋める
src/Root.tsx                     ← P1 composition の登録。この packet だけが触れる
```

## 機構固有 debug（層2）

A の機構は**離散的な選択と貼り付け**である。debug はそれを**見えるようにする**。

- 口パッチの矩形境界
- 選択された patch id（viseme）
- base PNG に対する合成矩形

A の上限は「離散選択」と「継ぎ目」であり、debug はそれを議論ではなく**表示**にする。

## 受入証拠

[共通仕様](p1-render-common.md)に加えて:

| 検査 | 期待 |
| --- | --- |
| P1-A の SHA-256 ≠ P0a の SHA-256 | 流用の検出 |
| still が sequence 宣言のフレーム | P0 の 0/309/618 でないこと |
| manifest に P0a との差分説明がある | `M3-02` の受入条件そのもの |
| `p1-i4` の P1-A policy で `src/Root.tsx` の変更が受理される | |
| 同 policy で `src/Main.tsx` の無関係な変更が**拒否される** | 抜け道になっていないこと |

## STOP 条件

[共通仕様](p1-render-common.md)に加えて:

- `src/Root.tsx` 以外の pin されたファイルの変更が必要になった
- P0a artifact が SHA-256 で見つからない（**パスで探しに行かない**。止めて報告する）

## PR 本文に書くこと

[共通仕様](p1-render-common.md)に加えて:

- P0a と P1-A の hash 両方と、**なぜ違うのか**
- `src/Root.tsx` の差分と、それが policy でどう受理されたか
- A の既知 failure（継ぎ目、離散選択）が debug 層2 でどう見えるか
