> この変更でユーザーは何ができるようになったか:

mi3sanは、アトラス案の構築可能性とラピスの反証を別記録として比較し、Goal承認前のhard blockerを判断できる。

# mi3san横断知識Vault ラピス敵対的レビュー

最終更新: 2026-07-23

状態: `REVIEW_GUARDRAIL`

レビュー対象: `docs/knowledge-vault-goal-proposal.md`

レビュー担当: ラピス

最終判断者: mi3san

## 1. 判定

判定は`REQUEST CHANGES`である。

mi3sanが示した`OWNER_DIRECTIVE`には異議がない。

現案のままPoCへ進むと、権限境界とSSOT境界が文書上だけ成立し、Git運用では回避できる可能性がある。

## 2. Hard blocker

### KV-REV-001 状態が一つの軸へ混在している

`state`には次の異なる概念が同居している。

- 証拠状態である`OBSERVED`
- リスク分類である`RISK`
- 提案状態である`PROPOSED`
- 権限を表す`OWNER_DIRECTIVE`
- 決定結果である`ACCEPTED_DECISION`と`REJECTED`
- lifecycleを表す`SUPERSEDED`

一つのpatternは、同時に観測済み、採択済み、後に置換済みになり得る。

単一の`state`ではこの状態を損失なく表現できない。

次のように直交する軸へ分離する必要がある。

- `evidence_status`: `OBSERVED`、`INFERRED`、`HYPOTHESIS`
- `decision_status`: `PROPOSED`、`ACCEPTED`、`REJECTED`、`SUPERSEDED`
- `workflow_stage`: `INBOX`、`CANDIDATE`、`REVIEWED`、`ACTIVE`、`RETIRED`
- `authority_ref`: owner statementまたはDecision noteへの参照

`OWNER_DIRECTIVE`は一般ノートの状態ではなく、`owner_statement`または`decision`の型と権限由来として表す方が安全である。

`EXPERIMENT_RESULT`も状態ではない。

生の実験結果はproject実行SSOTに置き、VaultではEvidence manifestがその結果を参照するべきである。

### KV-REV-002 権限モデルが宣言的で、機械的な境界になっていない

AIが`created_by: mi3san`や架空の`owner_approval_ref`を書けば、形式上はowner承認に見える。

Gitのauthor名やYAML propertyは本人性の証明にならない。

AIがmi3sanのGitHub credentialで動く場合、GitHub上でもmi3san本人の操作とAIによる代理操作を自動判別できない。

PoC前に、権限保証の強度を決める必要がある。

強い境界を必要とする場合は次が候補になる。

- AIが利用できない署名鍵によるowner attestation
- mi3sanが手動で作成する承認fileまたは署名済みDecision note
- restricted stateを変更するPRに対する保護rule
- `System`、`Actors`、`Decisions`へのCODEOWNERS
- restricted state transitionを検査するCI validator

署名などを使わない場合は、機械的に保証された権限ではなく、レビュー手順で守る運用規約であると明記する必要がある。

権限の実効性を過大評価してはならない。

### KV-REV-003 LLM_GUIDE.mdのSSOT分類が矛盾している

アトラス案の三層SSOTでは`LLM_GUIDE`を派生物としている。

一方、mi3sanの`OWNER_DIRECTIVE`では、PR #18の`LLM_GUIDE.md`を`neko-tera-video`固有の実行SSOTとして残す。

次のように分離しないと、再び二重正本になる。

- `neko-tera-video`固有の採択済み実行規約は、同projectの`LLM_GUIDE.md`を正本にする。
- Vault由来の横断知識を表示する部分は派生物とし、VaultのKnowledge IDと版へ遡れるようにする。
- 横断知識の本文を`LLM_GUIDE.md`へ複製しない。
- project固有規約と横断知識の投影を同じ文章として混ぜない。

最も単純な方式は、`LLM_GUIDE.md`をproject固有規約だけへ限定し、横断知識はIDと参照先だけを示す方式である。

### KV-REV-004 PoCが運用検証とKnowledge Transfer Testを混同している

現案のPoCは次の二つを一度に成功させようとしている。

- Obsidian、Git、Properties、権限状態、linkの運用PoC
- 別projectにおける横断patternのTransfer Test

後者は対象projectと実験機会に依存する。

Vault構造が妥当でもPoC全体が完了しない可能性がある。

次へ分割することを推奨する。

- `PoC-A`: Vault機構の検証
- `PoC-B`: 一つの知識候補のTransfer Test

`PoC-A`では、意図的な違反が拒否されるnegative testも必要である。

最低限、次を試すべきである。

- AIがowner stateへ変更する。
- 架空の`owner_approval_ref`を設定する。
- projectとVaultへ同一本文を複製する。
- enum外のpropertyを設定する。
- 存在しないEvidenceへlinkする。
- 同じIDを二つのbranchから作る。
- noteをArchiveへ移して外部参照を壊す。
- secret検査をすり抜ける疑似credentialを置く。

正常系を一度通せることだけを成功条件にしてはならない。

### KV-REV-005 4桁連番IDは分散Git運用で衝突する

複数branchで同時に作業すると、双方が`KNO-0042`を割り当てられる。

merge前に衝突を解決すると、IDの不変性や外部参照が壊れる。

候補は次である。

- prefix付きULID
- prefix、日付、短いrandom値
- UUID
- 中央ID registryと予約PR

初期PoCでは、人間可読な連番より衝突しないIDを優先する方が安全である。

## 3. Major findings

### KV-REV-006 探索状態機械に後退、停止、棄却がない

mi3sanが示した主経路は維持できる。

ただし、次の例外遷移がないと、誤った仮説を最後まで進めるサンクコスト構造になる。

- `FOCUSED_DEPTH → BROAD_SCAN`
- `SYNTHESIS → FOCUSED_DEPTH`
- `TRANSFER_TEST → FOCUSED_DEPTH`
- 任意状態から`PAUSED`
- 任意状態から`ABANDONED`

通常経路と例外経路を分けて定義するべきである。

Transfer Testは期待結果、失敗条件、比較方法を実験前commitへ保存する必要がある。

結果を見てから基準を変更できないようにするためである。

### KV-REV-007 停止条件が主観的である

「比較空間を説明できた」や「追加調査が結論をほとんど変えない」だけでは、探索者が都合よく停止できる。

各cycleには次が必要である。

- 調査予算
- 調査期間
- 候補追加の飽和条件
- 除外候補と除外理由
- 残存不確実性
- 追加調査のValue of Information
- 停止判断者
- 再開条件

### KV-REV-008 Evidenceの同一性と可用性が混同されている

commit SHAやartifact hashは同一性を示す。

将来も取得できることは保証しない。

次を追加する必要がある。

- artifactの保管責任者
- retention期間
- repository削除時の扱い
- force-pushや履歴改変への対応
- private repositoryのaccess boundary
- hash algorithm
- 最終到達確認日
- source licenseと再利用条件
- 外部pageのlink rot対応

PR #18から抽出するKnowledge候補は、PR branchのhead SHAではなく、squash merge後の`main`上のcommitとPR URLを出典にする必要がある。

未mergeのcommitを永続出典として固定してはならない。

### KV-REV-009 schemaのversionと型別制約がない

全ノートに`schema_version`が必要である。

`note_type`ごとの必須property、禁止property、relationの接続可能型も定義するべきである。

`evidenced_by`の終点は`evidence_manifest`でなければならない。

`interprets`の終点は`owner_statement`であるべきである。

Obsidian Properties自体は、この意味制約を保証するvalidatorではない。

Community Pluginを使わなくても、GitのCIで軽量なschema validatorを使う案は比較対象に含めるべきである。

これは自動昇格ではなく、不正な構造の検出である。

### KV-REV-010 source_commitsとEvidence manifestが二重正本になり得る

Knowledge noteにcommitを直接置きながら、Evidence manifestにもcommitを置くと不一致が起きる。

正本を一方へ固定する必要がある。

Knowledge noteは`evidence_refs`だけを持ち、commit、artifact、測定条件はEvidence manifestを正本にする方式を推奨する。

一覧表示用のcommit値が必要なら派生propertyとして扱う。

### KV-REV-011 Archiveへの移動が外部参照を壊す

projectからVault noteのpathを参照すると、`Archive`への移動でlinkが壊れる。

Obsidianが内部linkを書き換えても、外部repositoryの参照までは更新できない。

次のいずれかが必要である。

- Knowledge noteのpathは作成後に変更せず、状態だけを`RETIRED`へ変える。
- stable IDから現在pathを解決するindexを持つ。
- 旧pathへtombstoneを残す。

初期PoCでは、Knowledge noteをfolder間移動しない方式が最も単純である。

### KV-REV-012 project接続方式の比較が不足している

現案は相互参照fileを推奨しているが、project側へfileを置く必要性はまだ証明されていない。

少なくとも次を比較するべきである。

- Vault側だけに`project_ref`を持つ。
- project側にも薄い接続fileを置く。
- project ADRから必要なKnowledge IDだけを参照する。

初期PoCはVault側だけの参照でも成立する。

project側への接続file追加は、各projectで必要性が確認された後でも遅くない。

### KV-REV-013 派生物の鮮度契約がない

MOC、Bases、検索index、`LLM_GUIDE`の派生部分には次が必要である。

- `derived_from`
- source revision
- queryまたは生成条件
- 生成日時
- stale判定条件
- 再生成責任者
- 手編集可否

自動生成を今回実装する必要はない。

派生物を正本と誤認しない契約はGoal段階で必要である。

### KV-REV-014 disaster recoveryがSSOT設計に含まれていない

GitHub private repositoryだけでは、誤削除、account lockout、repository deletionへの備えにならない。

PoC成功条件へ、fresh cloneだけでなく、既知commitからの復元検査を追加するべきである。

remote、local clone、backupのどれを復旧元とするかも決める必要がある。

## 4. 承認できる点

次は方向性を承認できる。

- 三層SSOTを分離すること
- domainを排他的folderにしないこと
- 原子性を文章量ではなく反証可能性と独立したlifecycleで定義したこと
- ラピスとアトラスの記録を分けること
- mergeと採択を分けること
- `PROPOSED`のmain格納を認めつつowner承認とは扱わないこと
- 自動昇格を禁止したこと
- projectの生artifactをVaultへ複製しないこと
- submoduleと双方向syncを初期採用しないこと
- Community Pluginをdefault denyとしたこと
- original owner statementとAI解釈を別記録にすること
- Transfer Testの失敗結果も保存すること
- Goal段階でVaultを大量生成しないこと

## 5. 比較すべき二つの運用案

### 案A 強い権限保証

- protected main
- restricted pathへのCODEOWNERS
- schema validator
- owner専用署名
- signed Decision note
- negative test必須
- AIは`PROPOSED`branchだけを作成

権限境界を高い確度で守れる。

設定と運用costは増える。

### 案B 軽量な手続き保証

- PoC中は`PROPOSED`だけを作成
- owner stateをPoC対象外にする
- merge前にmi3sanが差分を手動確認
- 権限は機械保証ではなく運用規約と明記
- state validatorは後続PoCで追加

最小構成でObsidianとGitの適合性を検証できる。

AIとmi3sanが同じGitHub identityを使う場合、案Bの権限保証には限界がある。

## 6. mi3sanが判断すべき追加事項

| ID | 未決事項 | ラピス推奨 |
|---|---|---|
| `KV-GOV-013` | `LLM_GUIDE.md`の権威境界 | project固有規約だけを実行SSOTとし、横断知識本文は複製しない |
| `KV-GOV-014` | 権限保証の強度 | 最初は案B、owner state導入前に案Aを再評価 |
| `KV-GOV-015` | 状態schema | evidence、decision、workflow、authorityを分離 |
| `KV-GOV-016` | ID方式 | prefix付きULIDまたはrandom ID |
| `KV-GOV-017` | PoC分割 | 機構PoCとTransfer Testを分離 |
| `KV-GOV-018` | project側接続file | 初期PoCでは作らず、Vault側project_refだけで検証 |
| `KV-GOV-019` | Knowledge noteの移動 | path固定、廃止はpropertyとtombstoneで表現 |
| `KV-GOV-020` | Evidence retention | identity、可用性、保持期限を別契約として定義 |
| `KV-GOV-021` | schema validation | Community PluginではなくCI validatorを候補化 |
| `KV-GOV-022` | Vault復旧方針 | private remoteから既知commitを復元する試験をPoCへ追加 |
| `KV-GOV-023` | 探索の例外遷移 | nominal cycleを維持し、後退、停止、棄却を追加 |

## 7. 最終判定

アトラス案は、責務分離と基本思想については強い設計である。

状態軸、権限の本人性、`LLM_GUIDE.md`の権威境界、PoCの分割、ID衝突はGoal承認前に修正が必要である。

これらを修正し、Major findingsをPoCの設計契約へ反映すれば、ラピスはGoal段階を条件付き承認できる。

## 8. v0.2再レビュー

判定は`CONDITIONAL COMMENT`である。

初回の構造的なhard blockerは解消した。

新たな全面再設計は不要である。

### 8.1 初回指摘の解消状況

| 初回指摘 | 判定 |
|---|---|
| `KV-REV-001` 状態軸の混在 | 解消 |
| `KV-REV-002` 権限が宣言的 | 解消 |
| `KV-REV-003` `LLM_GUIDE.md`の権威矛盾 | 解消 |
| `KV-REV-004` PoCの混在 | 解消 |
| `KV-REV-005` 連番ID衝突 | 解消 |
| `KV-REV-006` 状態機械の後退、停止、棄却 | 解消 |
| `KV-REV-007` 主観的な停止条件 | 解消 |
| `KV-REV-008` Evidenceの同一性と可用性 | 解消 |
| `KV-REV-009` schema versionと型別制約 | 概ね解消 |
| `KV-REV-010` 出典の二重正本 | 一部未解消 |
| `KV-REV-011` Archive移動による参照破損 | 解消 |
| `KV-REV-012` project接続方式の比較不足 | 解消 |
| `KV-REV-013` 派生物の鮮度契約 | 解消 |
| `KV-REV-014` disaster recovery | 解消 |

### KV-REV-015 Evidence relationが二重定義されている

Properties schemaの`evidence_refs`とrelation vocabularyの`evidenced_by`を一方へ統一する必要がある。

`transfer_test_refs`と`tested_by`も同様である。

ラピスは`evidenced_by`と`tested_by`への統一を推奨する。

### KV-REV-016 restricted stateの検証条件が不足している

次の変更をrestricted transitionとして扱う必要がある。

- `decision_status: ACCEPTED`
- `decision_status: REJECTED`
- `decision_status: SUPERSEDED`
- `claim_kind: OWNER_DIRECTIVE`

これらは有効なDecision noteとowner authorityを必要とする。

`OWNER_DIRECTIVE`は`note_type: owner_statement`以外で使用できない型制約も必要である。

### KV-REV-017 直交軸間の不正な組合せを定義する必要がある

次のような不正な組合せをschema contractで禁止する必要がある。

- `decision_status: REJECTED`かつ`workflow_stage: ACTIVE`
- `decision_status: ACCEPTED`かつ`workflow_stage: INBOX`
- `claim_kind: OWNER_DIRECTIVE`かつ`note_type: pattern`
- `evidence_status: OBSERVED`だがEvidenceがない

`OBSERVED`は証拠の強さではなく、観測に基づく根拠種別である。

証拠品質は別の評価項目にする。

### KV-REV-018 PoC-Aのowner statement試験方法

owner statementをAIが作ると権限境界と衝突する。

mi3sanが保存範囲を指定して手動作成した最小fixtureをPoC-Aへ投入する方法を推奨する。

### 8.2 追加の判断事項

| ID | 判断事項 | ラピス推奨 |
|---|---|---|
| `KV-GOV-024` | Evidence relationの正本名 | `evidenced_by`へ統一 |
| `KV-GOV-025` | Transfer Test relationの正本名 | `tested_by`へ統一 |
| `KV-GOV-026` | restricted transition | `ACCEPTED`、`REJECTED`、`SUPERSEDED`、`OWNER_DIRECTIVE`をowner authority必須にする |
| `KV-GOV-027` | `OBSERVED`の最低条件 | 到達可能なEvidence manifestを必須にする |
| `KV-GOV-028` | PoC-Aのowner statement | mi3sanが指定した最小の手動fixtureを使用する |

### 8.3 再レビューの最終判定

`KV-REV-015`から`KV-REV-018`はGoalの基本構造を覆す問題ではない。

これらをschema contractとPoC-A成功条件へ反映すれば、ラピスはGoal段階を承認できる。

mi3sanの明示承認前は、アトラス案とラピス判定の双方を`PROPOSED`として維持する。

## 9. KV-REV-015からKV-REV-018反映後の最終監査

判定は`APPROVE`である。

`KV-REV-015`から`KV-REV-018`はすべて解消された。

Goal段階の設計として承認可能である。

残余条件は、`KV-GOV-001`から`KV-GOV-028`をmi3sanが明示承認するまで、全設計を`PROPOSED`に維持することである。

承認前にVault生成、PR #18の再編、PoC-A実装へ進まない。
