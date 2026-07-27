# P1 render packet 共通仕様（p1-a / p1-c2 / p1-d / p1-e）

4つの render packet に共通する部分をここへ集約する。各 packet はこれを読んだうえで、
自分の固有事項だけを自分の packet に書く。**このファイル単独では実行しない。**

## 4 packet 共通の成果物

| # | 成果物 |
| --- | --- |
| 1 | 方式別 adapter + render + 機構固有 debug（層2） |
| 2 | `pipeline/m3/p1/contracts/<base>.ts` の**空欄を埋める**（leaf 1つだけ。`index.ts` は触らない） |
| 3 | `out/m3/p1/<base>/attempt-1/` の artifact + manifest + conformance + evaluation |
| 4 | effort log の更新（`pipeline/m3/<base>/effort-log.json`） |
| 5 | **実フレームからの遮蔽証拠の再測定** ← これがカードの本体 |

## ⚠️ 成果物5 を閉じない packet はカードを終えていない

`pipeline/m3/occlusion-evidence.ts` は現在 D と E を `controlRangeSwept: false` として記録し、
`controlRangeDescription` に **"NOT SWEPT … rest pose only"** と書いている。

そして3つの未解決 failure が、いずれも**このカードで測ると明記している**。

| ID | 内容 | 測る場所 |
| --- | --- | --- |
| `C-KF-004` | yaw 時の層の接続が未検証。視差は層ごとに独立適用されている | `M3-05` の実フレーム |
| `D-KF-002` | 深度順序は rest pose のみ検証。顎回転・yaw 後は未検証 | `M3-07` の実フレーム |
| `E-KF-004` | view 制限は constraint として作画済みだが、その範囲で幾何が保つ保証が無い | `M3-09` の実フレーム |

render packet は、これらを**実フレームで測定し、`occlusion-evidence.ts` の該当エントリを更新する**。
測定して**駄目だった**場合は、駄目だったと記録する。**通るように許容差を緩めない。**

## 共通の依存

| 種別 | 内容 |
| --- | --- |
| 先行 packet | `p1-i1` 〜 `p1-i6` 全部 |
| owner 判断 | 決定①（ネット遮断設定）と決定②（各テストの長さ）。あわせて、sequence の平易な要約について mi3san の確認が済んでいること（決定⑧） |

## 共通の触ってはいけないもの

- `pipeline/m3/<base>/` の **asset そのもの**。asset の変更は `nativeAssetRevisions` を消費する。
  contract leaf と effort log は更新してよいが、`asset.ts` / `build_asset.py` / `.blend` は触らない
- `pipeline/m3/p1/contracts/index.ts` — `p1-i3` が完成させている
- 他方式の leaf
- kanban、`docs/anti-patterns.md`、`package.json`

## 共通の受入証拠

| コマンド | 期待 |
| --- | --- |
| `npm run m3:p1-preflight` | pass（enforcement 証跡が揃っていること） |
| `npm run m3:render-p1-<base>` | attempt-1 を生成 |
| `npm run m3:p1-conformance` | pass |
| `npx vitest run pipeline/m3/p1/<base>` | pass |
| `npm run typecheck` / `npm test` | pass |

**共通の必須検査。**

| 検査 | なぜ必要か |
| --- | --- |
| **2回目の render でバイト一致** | 決定性。これが崩れていれば比較の前提が無い |
| conformance の framing ランドマークが許容差内 | 4方式が同じ場所を見ていること |
| evaluation に順位 / スコアが**無い** | 型と実行時の両方で |
| 遮蔽証拠の `controlRangeSwept` が **true** になり、実測値が入っている | カードの本体 |
| attempt 2 を試みると ledger が正しく扱う | budget の機械的強制 |

## 共通の STOP 条件

- **render 試行が上限に達した**（`finalRenderAttemptsMax`）。上限を上げない。止めて報告する
- asset の変更が必要だと判明した（`nativeAssetRevisions` を消費する。**特に C は既に 3/2 で余地が無い**）
- enforcement 証跡がその実行ファイルに対して存在しない（**fail closed で落ちるはず**）
- 新規 dependency、add-on、cloud / 有料サービスが必要になった

## 共通の非対象

- 品質順位付け、方式採択、`representationDecision` の記入
- 他方式との比較（それは `p1-m` / `M3-12`）
- 見た目の作り込み（**P2 の作業**。D/E はマテリアルも線も無いのが正しい状態である）

## 共通の PR 本文

- 遮蔽証拠の**測定前と測定後**、および `controlRangeSwept` が true になったか
- 使用した render 試行回数と残り
- 2回目 render のバイト一致確認
- 観測した failure。一般化するなら **AP番号の払い出しを Orbit へ要求する**（自分で追記しない）
