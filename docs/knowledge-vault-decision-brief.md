> この変更でユーザーは何ができるようになったか:

mi3sanは、アトラス案とラピスの反証、採用した修正、PoC前に必要な承認を一つのbriefで比較できる。

# mi3san横断知識Vault Goal判断brief

最終更新: 2026-07-23

状態: `PROPOSED`

最終判断者: mi3san

## 1. 現在の結論

独立Vaultを横断知識SSOTにし、各project repositoryを実行SSOTにする基本構造は、アトラスとラピスの双方が妥当と判断している。

ラピスの最終監査判定は`APPROVE`であり、初回hard blockerと追加条件は解消した。

mi3sanの明示承認前であるため、設計状態は`PROPOSED`のままである。

PR #18は未mergeである。

`neko-tera-video/LLM_GUIDE.md`は同project固有の実行SSOTとして残し、横断知識本文を複製しない。

現在はGoal段階であり、Vault repository、Community Plugin、自動link、自動昇格、自動syncはまだ作成または導入しない。

## 2. 分離して読む正本

- アトラス設計案v0.2: `docs/knowledge-vault-goal-proposal.md`
- ラピス初回敵対的レビュー: `docs/knowledge-vault-lapis-review.md`
- mi3sanの承認記録: 未作成

ラピスの文章をアトラス案で上書きしていない。

アトラス案の修正履歴は、ラピスの指摘へ応答する形で残している。

## 3. アトラス案とラピス案の比較

| 争点 | アトラスv0.1 | ラピス指摘 | アトラスv0.2 |
|---|---|---|---|
| 状態schema | 一つの`state`と`maturity` | 証拠、採否、workflow、権限が混在 | 直交する四軸へ分離 |
| owner権限 | Decision noteとPR review | Git authorとYAMLは本人性を証明しない | PoCは軽量案、owner state前に強いattestationを再評価 |
| `LLM_GUIDE.md` | project実行SSOTだが派生物一覧にも記載 | 二重正本になる | project固有規約だけを正本に限定 |
| PoC | 機構とTransfer Testを一つにした | 外部project待ちで機構検証まで止まる | PoC-A機構とPoC-B Transfer Testへ分離 |
| stable ID | prefix付き連番 | branch間で衝突する | prefix付きULID |
| 探索cycle | 主経路だけ | 後退、停止、棄却がない | 例外遷移、予算、Value of Informationを追加 |
| Evidence | commitとhashを重視 | 同一性と可用性が混在 | custodian、retention、access、last verifiedを追加 |
| Evidence参照 | KnowledgeとEvidenceの両方にcommit | 二重正本になる | commitとartifact情報をEvidence manifestへ一元化 |
| schema検査 | Properties中心 | 型別意味制約を保証できない | Community PluginではなくCI validatorをPlan候補化 |
| Archive | 廃止noteを移動 | 外部参照が壊れる | canonical path固定、propertyとtombstoneで廃止 |
| project接続 | 双方に薄い接続file | project側fileの必要性が未証明 | PoC-AはVault側`project_ref`だけ |
| 派生物 | 再生成可能と定義 | 鮮度契約がない | source revision、stale条件、責任者を追加 |
| 復旧 | fresh cloneを確認 | remote消失へ備えられない | local、remote、offline backupと復元試験を追加 |
| relation名 | `evidence_refs`と`evidenced_by`が重複 | 二重正本になる | `evidenced_by`と`tested_by`へ統一 |
| restricted transition | `ACCEPTED`だけを強く検査 | `REJECTED`などもAI変更禁止 | `ACCEPTED`、`REJECTED`、`SUPERSEDED`、`OWNER_DIRECTIVE`を制限 |
| 状態の組合せ | 各軸だけをenum化 | 軸間に不正な組合せを作れる | 禁止組合せと`OBSERVED`のEvidence必須条件を追加 |
| owner fixture | AI候補とowner原文を比較 | AIがfixtureを作ると権限衝突 | mi3sanが指定して手動作成したread-only fixtureを使用 |

## 4. 権限保証の二案

### 案A 強い権限保証

protected `main`、CODEOWNERS、schema validator、owner専用署名、signed Decision noteを使う。

owner stateを高い確度で保護できる。

設定と日常運用のcostは増える。

### 案B 軽量な手続き保証

PoCでは`PROPOSED`だけを作り、mi3sanがmerge前に差分を手動確認する。

ObsidianとGitの適合性を最小構成で検証できる。

AIとmi3sanが同じGitHub identityを使う場合、本人性は機械保証できない。

### アトラス推奨

PoC-Aは案Bで開始する。

owner stateを実運用へ入れる前に案Aを再評価する。

案Bの期間は、Vault内で`ACCEPTED`、`REJECTED`、`OWNER_DIRECTIVE`をAIが新規作成または変更しない。

## 5. PoCの二段階

### PoC-A Vault機構

Community Pluginなしで、Properties、link、Bases、Git、schema、negative test、復元を確認する。

`neko-tera-video`以外のprojectはまだ必要ない。

### PoC-B Knowledge Transfer Test

PoC-A合格後に、一つのKnowledge候補を別projectで検証する。

対象project、期待結果、失敗条件、比較方法は実験前commitへ保存する。

PoC-Bの失敗は、Vault機構の失敗ではなくKnowledge候補の境界または反例として扱える。

## 6. mi3sanに承認を求める設計bundle

### Bundle A SSOTとschema

- 独立private repositoryを横断知識SSOTにする。
- project実行SSOTと派生物を分離する。
- `LLM_GUIDE.md`はproject固有規約だけを正本にする。
- 状態を`claim_kind`、`evidence_status`、`decision_status`、`workflow_stage`、`authority_refs`へ分離する。
- Evidence relationを`evidenced_by`、Transfer Test relationを`tested_by`へ統一する。
- restricted transitionと状態軸間の禁止組合せをschema contractへ入れる。
- stable IDはnote型prefix付きULIDにする。
- canonical noteのpathを作成後に変更しない。

アトラスは承認を推奨する。

### Bundle B ObsidianとGit

- repository候補を`wit-maker/mi3san-knowledge`とする。
- 本文は日本語、property keyとslugは英語にする。
- `.obsidian`は共有するCore Plugin設定とtemplateだけを選択的にcommitする。
- Community Pluginはdefault denyにする。
- PoC-AはVault側`project_ref`だけを作り、project repositoryを変更しない。
- mergeとKnowledge採択を分離する。
- Evidenceの同一性、可用性、保持期限、責任者を分ける。
- known commitからの復元試験を行う。

アトラスは承認を推奨する。

### Bundle C 権限保証

- PoC-Aは案Bで行う。
- PoC-A中はAIが`PROPOSED`だけを作る。
- owner stateを導入する前に案Aを再評価する。

アトラスはこの段階方式を推奨する。

### Bundle D PoC

- PoC-AとPoC-Bを分ける。
- PoC-Aは三つ以下のKnowledge候補で機構を検証する。
- owner statementはmi3sanが指定して手動作成した最小fixtureをread-only参照する。
- PoC-Bの対象projectはPoC-A合格後にmi3sanが指定する。
- 最初の抽出候補は状態モデル、conformanceとevaluationの分離、長時間job状態機械とする。

アトラスは承認を推奨する。

## 7. 個別に残る未決事項

| ID | mi3sanの判断が必要な内容 | 推奨 |
|---|---|---|
| `KV-GOV-001` | remoteを`wit-maker/mi3san-knowledge`として作成するか | 承認 |
| `KV-GOV-004` | `.obsidian`の共有範囲 | Core Plugin設定とtemplateだけ |
| `KV-GOV-005` | attachment上限 | PoCは小さな画像だけ |
| `KV-GOV-006` | 最初の三候補 | 状態、conformance分離、長時間job |
| `KV-GOV-007` | PoC-B対象project | PoC-A後に指定 |
| `KV-GOV-008` | owner原文の保存範囲 | mi3san指定の抜粋だけ |
| `KV-GOV-012` | Goal文書の移管 | Vault初期化時に移管し、このprojectには接続契約だけ残す |
| `KV-GOV-014` | 権限保証 | PoC-Aは案B、owner state前に案A |
| `KV-GOV-020` | CI schema validator | PoC-A Planの比較候補へ入れる |
| `KV-GOV-021` | offline backupの場所と管理者 | PoC-A Plan前に指定 |
| `KV-GOV-024` | Evidence relation | `evidenced_by`へ統一 |
| `KV-GOV-025` | Transfer Test relation | `tested_by`へ統一 |
| `KV-GOV-026` | restricted transition | 4種すべてowner authority必須 |
| `KV-GOV-027` | `OBSERVED`の条件 | 到達可能なEvidence manifest必須 |
| `KV-GOV-028` | owner fixture | mi3sanが指定して手動作成 |

## 8. PR #18の扱い

Goal承認前は`LLM_GUIDE.md`を分割せず、VaultへのKnowledge抽出も行わない。

Goal承認後に、PR #18のtitle、body、project入口、Serena memoryをproject-localな表現へ修正する。

PR #18からKnowledge候補を抽出する時は、未mergebranchのHEADではなく、squash merge後の`main` commitとPR URLをEvidence manifestへ記録する。

## 9. mi3sanが承認した後の順序

1. PR #18をproject-localな実行ガイドへ修正する。
2. 修正版をreviewし、squash mergeする。
3. squash merge後のcommitを出典として固定する。
4. 独立private repositoryと最小Vaultを作る。
5. PoC-AをPlan化する。
6. PoC-Aの正常系、negative test、復元試験を実行する。
7. mi3sanがPoC-A artifactを比較する。
8. PoC-Bの対象projectとKnowledge候補を決める。

承認前にこの順序を実装へ進めない。
