# p1-m · capability matrix と Track A evidence（M3-12）

**カード:** `M3-12`
**branch:** `codex/p1-m-capability-matrix`。`main` から分岐
**担当:** Forge + Orbit
**読むもの:** [README](README.md) → `AGENTS.md` → `pipeline/m3/occlusion-evidence.ts` → 本 packet

## 目的

6方式（A / B1 / B2 / C / D / E）の能力を**軸ごとに別々のまま**提示する。
`M3-13` で mi3san が候補を絞るための入力を作る。

## ⚠️ この packet の失敗の形は「まとめてしまうこと」である

`AGENTS.md` と ADR-001 が繰り返し禁じている。

> 視覚品質、制作コスト、計算資源、再現性、操作性、ライセンスは分けて提示し、**未合意の重み付き総合点へ潰さない**。

**総合点も順位も作らない。** 読み手に「どれが一番か」を教える表を作った時点で、この packet は失敗している。
作るのは「どの方式が何をできて、何ができないか」の表である。

## 依存

| 種別 | 内容 |
| --- | --- |
| 先行 packet | `p1-a`、`p1-c2`、`p1-d`、`p1-e` の4つ全部 |
| merge 済み PR | **#31**（B2）、**#32**（B1）、**#37**（遮蔽証拠コントラクト） |
| owner 判断 | **決定③（K-02 人時計上）** — これが無いとコスト軸が組めない |

## 実装対象

```
pipeline/m3/p1/matrix.ts
pipeline/m3/p1/matrix.test.ts
out/m3/p1/capability-matrix.json   （生成物。out/ は gitignore）
```

## 触ってはいけないもの

- 各方式の asset、contract leaf、render 成果物
- kanban、`docs/anti-patterns.md`、`package.json`

## 実装内容

### 軸

`AGENTS.md` の定める軸を**別々のまま**持つ。

| 軸 | 内容 |
| --- | --- |
| 視覚品質 | 実artifactへの参照。**数値化しない** |
| 制作コスト | effort log。**決定③ が未決なら「未確定」と表示する** |
| 計算資源 | render 時間、VRAM、出力容量 |
| 再現性 | 2回目 render のバイト一致の有無 |
| 操作性 | native control の数と種類、asset 修正手順 |
| ライセンス | tool と asset の由来 |
| 能力 | observable ごとに supported / approximated / unsupported |

### 能力セルの裏付け

遮蔽に関するセルは、**`validateOcclusionEvidence()` が空配列を返すこと**で裏付ける。

- errors が残っている方式は、**空欄ではなく「not established」と表示する**。
  空欄は「調べていない」と「調べたが確立しなかった」を区別できない
- `BASES_WITHOUT_RUNTIME_OCCLUSION`（A / B1 / B2）は **「機構として無い」**と表示する。
  実行時に遮蔽を計算しない方式なので、これは**やっていないのではない**

### B1 / B2 の扱い

| 方式 | 扱い |
| --- | --- |
| **B1** | **中心品質順位に混ぜない**（`M3-10` の STOP 条件）。ただし finalist 可否は `OPEN` のまま。**agent が閉じない** |
| **B2** | **品質上限の対照**であって候補ではない。`coreComparisonMember: false` を尊重する |

`pipeline/m3/b1/conformance.ts` と `pipeline/m3/b2/conformance.ts` が、これを機構的に強制している。
matrix はそれを**再確認する**。

### Track B cycle log

現時点で Track B は未実行である。**「未実行」と記録する。** Track A の結果を Track B の結果として提示しない。

## 受入証拠

| コマンド | 期待 |
| --- | --- |
| `npm run m3:p1-capability-matrix` | pass |
| `npx vitest run pipeline/m3/p1/matrix` | pass |
| `npm run typecheck` / `npm test` | pass |

**否定テスト。** 次はすべて**落ちなければならない**。

| 検査 | なぜ必要か |
| --- | --- |
| matrix に総合点 / スコア / 順位 / 順序フィールドが存在する | **この packet の最大の失敗形** |
| B1 が中心品質順位に含まれている | `M3-10` の STOP |
| B1 の `finalistEligibility` が `OPEN` 以外になっている | agent が閉じてはならない |
| B2 が core 候補として扱われている | `M3-11` の STOP |
| 遮蔽セルが `validateOcclusionEvidence()` の errors を無視して埋まっている | 未確立を確立として表示しない |
| 未確立の方式が**空欄**で表示される | 「調べていない」と区別できない |
| コスト軸が決定③ 未決のまま数値で埋まっている | 捏造の検出 |

## STOP 条件

- **決定③（K-02）が未決。** コスト軸を推測値で埋めない。「未確定」と表示して報告する
- ある方式の遮蔽証拠が確立していない（**それは表示すべき事実であって、埋めるべき穴ではない**）
- 総合点を求められた（**作らない。止めて報告する**）

## 非対象

- 候補の retain / drop（**それは `M3-13`、mi3san の判断**）
- 方式採択、ADR への記録
- 品質の数値化

## PR 本文に書くこと

- 各軸がどう分離されているか、統合していないことの確認方法
- 遮蔽セルのうち「not established」になった方式と理由
- 決定③ が未決の場合、コスト軸をどう表示したか
- **`M3-13` で mi3san が見るべきものが揃っているか**（normal / slow / crop / debug / still と軸別 evidence）
