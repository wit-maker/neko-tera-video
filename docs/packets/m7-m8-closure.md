# m7-m8 · 最終判断と closure（M7-00〜05、M8-00〜04）

**担当:** Orbit（提示と記録）、mi3san（判断）、Forge（実装と検証）
**性質:** `M7-01` は **agent が代行できない**。ここを packet 化しない

## この文書の位置づけ

プログラムの終端である。**ゴールの完了判定条件は、ここが終わったときに満たされる。**

```
選定方式（またはevidence付きno-go）が ADR に記録されている
選定方式の production integration が vertical slice として動き、rerender と rollback が検証済み
全artifactが source commit / tool version / hash / license / 実測値 / 決定 まで追跡可能
PROJECT_STATE.md が完了状態を正確に記録している
観測済みの再発failureが文書だけでなく test / validator / 受入条件で機械的に防止されている
```

## M7 — 最終判断と本番移行

| カード | 誰が | 内容 | packet 化 |
| --- | --- | --- | --- |
| **M7-00** | Orbit | 全候補の artifact / evidence を**軸別** decision packet へ集約する | ○ `m7-decision-packet` |
| **M7-01** | **mi3san** | **実映像比較で最終 representation を選定する、または evidence 付き no-go にする** | **✕ 判断である** |
| **M7-02** | Orbit | 決定を ADR へ記録する（決定、根拠 artifact、scope、未解決リスク） | ○ `m7-adr` |
| **M7-03** | Forge | 選定 representation を production integration へ実装する（adapter / native asset / render / validator / operation の vertical slice） | ○ `m7-integration` |
| **M7-04** | Forge + Orbit | production migration を**再現・運用検証**する（source / tool / version / hash、rerender、rollback） | ○ `m7-migration-verify` |
| **M7-05** | Orbit | **no-go の場合のみ** — 構造上限と必要な architecture change を evidence 付きで記録し、Atlas 再招集の可否を判定する | ○ `m7-nogo` |

### M7-00 の STOP 条件

**weighted total score を作らない。** `AGENTS.md` が「未合意の重み付き総合点へ潰さない」と明記している。
`M7-01` は mi3san が**実映像を通常速度・スロー・拡大・デバッグ表示で比較して**行う。
decision packet はその材料を並べるのであって、結論を出さない。

### M7-04 の受入条件

`rerender` と `rollback` の**両方**が検証済みであること。ゴールの完了判定条件2 がこれを名指ししている。

## M8 — closure

| カード | 内容 | 受入条件 |
| --- | --- | --- |
| **M8-00** | final artifact registry を確定する | artifact / source commit / tool version / hash / license / 実測値 / 決定 が**全て追跡可能** |
| **M8-01** | `PROJECT_STATE.md` をプログラム完了状態へ更新する | 選定 migration または no-go が正確に記録されている |
| **M8-02** | obsolete な branch / artifact / firewall rule を参照確認後に削除する | 残す証拠と消す一時物が分離されている。`M0-05` の判断が前提 |
| **M8-03** | **観測済みの再発 failure だけ**を test / validator / 受入条件へ戻す | 文書だけでなく**機械的防止がある** |
| **M8-04** | Vault へ送る候補を**列挙するだけ**に留め、program を閉じる | Vault 生成 / 同期なしで close report が完成する |

### M8-02 の注意

削除対象には、この session が確認した次が含まれる。**参照確認前に消さない。**

- `codex/knowledge-vault-design-drafts` — Vault 設計文書3件の**唯一の原本**（1,567行）。`M8-04` の Vault 候補列挙で参照する
- Codex worktree（`C:\Users\wiiiiii\.codex\worktrees\ff8a\`）— **`M3-01` の Blender provision 1.3GB が入っている**。
  D/E の receipt がこれを指す。`M8-00` の registry 確定後でなければ消せない
- `codex/p0-proof-vertical-slice` — 未push commit 3件あり。`M0-03` の判定では `keep`

### M8-03 の対象（現時点）

| AP | 機械的防止 | 状態 |
| --- | --- | --- |
| AP-009 | `pipeline/p0/verify-network.ts`、および `p1-i4` の汎用 gate | ✅ 済 |
| AP-010 | `pipeline/m3/c/conformance.ts`、`pipeline/m3/occlusion-evidence.ts` の `hiddenStateVerified` | ✅ 済 |
| AP-011 | `pipeline/m3/c/deform.ts` の単一 `jawDrop` 変位場 | ✅ 済 |
| AP-012 | 両側三角形分割、グリッド標本照合、`occlusion-evidence.ts` の `independentOfAuthoredValues` / `crossCheckedAgainstIndependentReference` | ✅ 済 |
| AP-013 | 全体スケール実装、自己交差掃引、`occlusion-evidence.ts` の `controlRangeSwept` | ✅ 済 |

**P1 render 波で新たに観測された failure があれば、ここへ追加する。**
`M8-03` の STOP は「将来リスク・一般論の追記」であり、**観測していないものを足さない**（AP-007）。

## closure の判定

`M8-04` 完了時点で、冒頭のゴール完了判定条件5項目がすべて満たされる。
**満たされていないものを満たされたと書かない**（`M8-01` の STOP は「decision 未確定」である）。
