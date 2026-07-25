# mi3san横断知識Vault Goal設計案

最終更新: 2026-07-23

状態: `PROPOSED`

版: `v0.2`

提案者: アトラス

最終判断者: mi3san

敵対的レビュー: 最終`APPROVE`

レビュー記録: `docs/knowledge-vault-lapis-review.md`

オーナー承認: 未承認

移管先候補: `C:\dev\github\wit-maker\mi3san-knowledge`

この文書は、独立Vaultの設計を判断するための一時的なGoal成果物である。

この文書自体を横断知識SSOTとせず、Vaultが承認されて初期化された時点で、承認済みのVaultガバナンス文書へ移管する。

## 1. Goal

複数プロジェクトで得た原理、モデル、デザインパターン、アンチパターン、実験から得た転用可能な知見を、出典と権限状態を失わずに蓄積できる独立した知識SSOTを設計する。

Goal段階では、Vaultの境界、情報モデル、権限、昇格条件、プロジェクト接続、PoCの成功条件を定義する。

Goal段階では、Vaultの大量生成、Community Plugin導入、自動リンク、自動昇格、自動同期を実装しない。

## 2. オーナー指示として固定する前提

次の前提は設計案ではなく、mi3sanの`OWNER_DIRECTIVE`として扱う。

- Vaultは複数プロジェクト横断の知識SSOTである。
- 各プロジェクトのコード、現在状態、ADR、受入条件、実験結果、artifact、Plan、Implementationは各プロジェクトが正本である。
- `LLM_GUIDE`、MOC、Bases、Graph View、検索インデックス、ダッシュボードは派生物である。
- ラピスとアトラスは対等であり、ラピスはアトラスの補佐ではない。
- アトラスとラピスが合意しても、mi3sanの明示承認がなければ`PROPOSED`のままである。
- Science、Art、Design、Engineering、Businessを排他的な保存フォルダにしない。
- 一つの知識ノートは複数のdomainを持てる。
- AIは`PROPOSED`、`RISK`、`OBSERVED`の候補を追加できる。
- AIは`OWNER_DIRECTIVE`、`ACCEPTED_DECISION`、`REJECTED`へ直接変更できない。
- mi3sanの原文をAIの解釈で上書きしない。
- 横断パターンへの昇格には出典、適用条件、失敗境界、反例、Transfer Testが必要である。
- 同じ文書をVaultと各プロジェクトへ複製しない。

## 3. Vaultの責務

Vaultは次を正本として保持する。

- Actorと役割境界
- 複数プロジェクトへ適用可能な原理
- 複数の事象を説明するモデル
- デザインパターン
- アンチパターン
- 分野横断の統合知見
- 横断知識を探索するcycle
- 横断知識の昇格、棄却、廃止に関する決定
- 出典を指すEvidence manifest
- 各プロジェクトへの参照情報

Vaultは知識の結論だけでなく、どの条件で成立し、どこで失敗し、何が反証し得るかを保持する。

## 4. Vaultの非責務

Vaultは次の正本にならない。

- プロジェクトのコード
- `PROJECT_STATE`
- プロジェクト固有ADR
- 現在のPlanとImplementation
- プロジェクト固有の受入条件
- 生の実験結果
- 動画、画像、モデルなどの大容量artifact
- credential、token、秘密鍵
- raw session logやraw prompt
- 個人情報
- LLMごとの一時memory

VaultのEvidenceは、これらを複製せず、immutableなcommit、artifact ID、hash、またはプロジェクト内pathを参照する。

## 5. 三層SSOT

### 5.1 横断知識SSOT

独立Vaultだけを正本とする。

対象はActor、原理、モデル、パターン、アンチパターン、統合知見、探索cycleである。

### 5.2 プロジェクト実行SSOT

各プロジェクトのrepositoryだけを正本とする。

対象はコード、現在状態、プロジェクトADR、受入条件、実験結果、artifact、Plan、Implementationである。

`neko-tera-video`では、`PROJECT_STATE.md`、`docs/architecture-governance.md`、`docs/adr/`、`docs/anti-patterns.md`、実装と検証artifactがこの層に属する。

### 5.3 派生物

派生物は検索、閲覧、LLMへの注入を容易にする投影であり、新しい正本を作らない。

対象はMOC、Bases、Graph View、AI検索インデックス、ダッシュボードである。

派生物から原子ノートやプロジェクト正本へ逆参照できなければならない。

派生物の削除と再生成によって、正本の知識が失われてはならない。

`LLM_GUIDE`は配置先によって権威範囲が異なる。

`neko-tera-video/LLM_GUIDE.md`のproject固有実行規約は、同projectの実行SSOTである。

Vaultの横断知識を表示する部分だけが派生物である。

初期設計では混在を避けるため、projectの`LLM_GUIDE.md`をproject固有規約だけに限定する。

横断知識は本文を複製せず、Knowledge IDとcanonical参照だけを示す。

### 5.4 派生物の鮮度契約

派生物は次を宣言する。

- `derived_from`
- source revision
- queryまたは生成条件
- 生成日時
- stale判定条件
- 再生成責任者
- 手編集の可否

自動生成はGoal段階で実装しない。

鮮度情報がない派生物を判断根拠にしない。

## 6. Actorと権限モデル

| Actor | 主責務 | 許される変更 | 禁止する変更 |
|---|---|---|---|
| mi3san | 成果物比較、最終採否、権限境界の決定 | すべての状態の承認、訂正、廃止 | なし |
| ラピス | 候補調査、前提検証、比較漏れ、現状維持バイアスの敵対的レビュー | `PROPOSED`、`RISK`、`OBSERVED`候補、レビュー記録 | オーナー状態への昇格 |
| アトラス | 技術戦略、全体アーキテクチャ、実装順序、投資配分の提案 | `PROPOSED`、`RISK`、`OBSERVED`候補、レビュー回答 | オーナー状態への昇格 |
| オービット | 承認済み戦略のPoC、タスク、依存関係、受入条件への分解 | 承認済みGoalに基づくPlan候補 | 未承認Goalの採択 |
| フォージ | 承認済みタスクの実装、artifactと検証結果の保存 | 実装結果と`OBSERVED`候補 | Goal、権限、採択状態の変更 |

ラピスのレビュー記録とアトラスの回答は別ノートまたは別sectionとして保存する。

一方の文章をもう一方が要約して置き換えない。

Git上のmergeは、知識状態の承認を意味しない。

`PROPOSED`ノートを`main`へmergeしても、propertyの`decision_status`は`PROPOSED`のままである。

Git author、commit author、`created_by`、`authority_ref`だけではmi3san本人の承認を証明できない。

AIがmi3sanのcredentialで操作する場合、GitHub上のidentityだけでも代理操作を判別できない。

したがって、PoCでは次の二段階を分ける。

- PoC-AではAIが`PROPOSED`候補だけを作り、owner stateの機械保証を主張しない。
- owner stateを運用へ入れる前に、owner専用attestation、protected path、CODEOWNERS、CI validatorを比較する。

署名を使わない期間の権限境界は、機械保証ではなくmi3sanの手動reviewで守る運用規約である。

`OWNER_DIRECTIVE`、`ACCEPTED_DECISION`、`REJECTED`を記録する場合は、mi3sanがAIへ渡していない経路で作成したattestationをDecision noteから参照する強い方式を候補にする。

## 7. フォルダ責務

フォルダは分野分類ではなく、情報の責務とlifecycleを表す。

| Folder | 責務 |
|---|---|
| `System` | Vaultガバナンス、schema、relation vocabulary、template、運用契約 |
| `Actors` | Actor定義、権限境界、明示承認された役割変更 |
| `Knowledge` | 原理、モデル、パターン、アンチパターン |
| `Domains` | domain定義と派生MOC |
| `Projects` | 各プロジェクト正本への参照と接続契約 |
| `Evidence` | 出典、commit、artifact、hashを束ねるmanifest |
| `Decisions` | Vaultガバナンスと横断知識の採択、棄却、廃止 |
| `Cycles` | 探索状態、問い、停止条件、次cycleへの引継ぎ |
| `Synthesis` | 複数原子ノートから得た統合仮説 |
| `Inbox` | AIと人が追加する未整理候補 |
| `Archive` | canonical noteを移動せずに残すtombstone、廃止済み派生物、外部参照されない履歴 |

`Domains/Science`などを知識の保存先にしない。

domain MOCは`domains` propertyを問い合わせる派生viewとする。

`Inbox/Candidates`は候補の一時置場として使用できるが、`Candidate`を独立した知識分類にはしない。

外部参照されたcanonical noteはfolder間で移動しない。

廃止は`workflow_stage: RETIRED`と`decision_status: SUPERSEDED`で表し、必要なら旧pathへtombstoneを残す。

## 8. 原子ノートの定義

原子ノートは短さで決めない。

一つの主張、モデル、失敗構造、証拠束、または決定を、単独で参照、反証、採択、棄却、廃止できる単位とする。

次の問いのどれかに複数の独立した答えがある場合は、ノートを分ける。

- 何を主張しているか。
- 何が反証になり得るか。
- どの条件で適用できるか。
- どの状態へ昇格または廃止できるか。
- どの出典へ遡るか。

複数ノートを読まないと意味が成立しないほど細分化しない。

## 9. ノート型

### 9.1 知識型

| `note_type` | 内容 |
|---|---|
| `principle` | 複数状況を拘束する一般原理 |
| `model` | 状態、因果、構造、比較軸を説明する表現 |
| `pattern` | 条件、問題、解決構造、結果を持つ再利用可能な設計 |
| `anti_pattern` | 観測された失敗構造、原因、禁止形、代替策 |
| `claim` | まだ独立patternへ整理されていない単一主張 |
| `synthesis` | 複数知識ノートから導いた統合仮説 |

### 9.2 証拠と統治型

| `note_type` | 内容 |
|---|---|
| `actor` | Actorの役割と権限 |
| `owner_statement` | mi3sanが保存を明示承認した原文抜粋 |
| `evidence_manifest` | project、commit、artifact、hash、測定条件への参照 |
| `decision` | Vaultガバナンスまたは横断知識の採択状態 |
| `review` | ラピスの敵対的レビューまたはアトラスの回答 |
| `cycle` | 探索cycleの問い、状態、停止条件、出力 |
| `project_ref` | プロジェクト実行SSOTへの接続情報 |

### 9.3 派生型

MOC、Base、Graph、検索index、dashboardは原子ノートではなく派生物である。

派生物には`derived_from`またはquery条件を保存する。

## 10. Properties schema

Obsidianの標準Propertiesが扱えるtext、list、number、checkbox、date、date and time、tagsだけを使用する。

入れ子propertyは使用しない。

同じproperty名はVault全体で同じ型と意味を持つ。

property keyは英小文字の`snake_case`へ固定し、表示名と本文は日本語を許可する。

### 10.1 全ノート必須

| Property | Type | 意味 |
|---|---|---|
| `schema_version` | text | schemaの互換version |
| `id` | text | 変更しないstable ID |
| `note_type` | text | ノート型 |
| `claim_kind` | text | `CLAIM`、`RISK`、`OWNER_DIRECTIVE`、`NOT_APPLICABLE` |
| `evidence_status` | text | 主張がどの根拠種別にあるか |
| `decision_status` | text | 採否の状態 |
| `workflow_stage` | text | 作業上のlifecycle |
| `title` | text | 人が読む名称 |
| `summary` | text | Markdownを含まない一文要約 |
| `domains` | list | 複数domain |
| `created` | date | 作成日 |
| `updated` | date | 最終更新日 |
| `created_by` | text | 作成Actor |

### 10.2 直交する状態語彙

`claim_kind`は内容の種類を表す。

- `CLAIM`
- `RISK`
- `OWNER_DIRECTIVE`
- `NOT_APPLICABLE`

`evidence_status`は証拠の強さではなく、主張がどの根拠種別にあるかを表す。

- `UNTESTED`
- `HYPOTHESIS`
- `INFERRED`
- `OBSERVED`
- `NOT_APPLICABLE`

`decision_status`は採否だけを表す。

- `PROPOSED`
- `ACCEPTED`
- `REJECTED`
- `SUPERSEDED`
- `NOT_APPLICABLE`

`workflow_stage`は作業上のlifecycleだけを表す。

- `INBOX`
- `CANDIDATE`
- `REVIEWED`
- `ACTIVE`
- `RETIRED`

mi3sanの指示は`note_type: owner_statement`、`claim_kind: OWNER_DIRECTIVE`、owner attestationへの`authority_refs`で表す。

`EXPERIMENT_RESULT`は状態にしない。

project実行SSOTにある実験結果を、`evidence_manifest`の`evidence_kind`から参照する。

`OPEN`はDecision noteの未決事項listとして扱う。

`REVIEW_GUARDRAIL`はreview noteの`review_outcome`として扱う。

### 10.3 出典と適用範囲

| Property | Type | 意味 |
|---|---|---|
| `evidenced_by` | list | evidence_manifestへのlink |
| `applies_when` | list | 適用条件 |
| `fails_when` | list | 失敗境界 |
| `counterexample_refs` | list | 反例または反証証拠 |
| `tested_by` | list | Transfer Testまたは実験定義 |
| `supersedes` | list | 置換するノート |
| `superseded_by` | list | 後継ノート |

長い条件説明は本文へ置き、propertyには短いlabelまたは内部linkを置く。

Knowledge noteはcommit、artifact hash、測定条件を直接持たない。

これらの正本はEvidence manifestへ一元化し、Knowledge noteは`evidenced_by`だけを持つ。

### 10.4 権限とレビュー

| Property | Type | 意味 |
|---|---|---|
| `proposed_by` | text | 提案Actor |
| `reviewed_by` | list | レビューActor |
| `decision_ref` | text | 状態変更を承認したDecision note |
| `authority_refs` | list | owner attestationまたは権限根拠への参照 |
| `verbatim_source_ref` | text | 原文の保存場所 |
| `interpretation_of` | list | 解釈対象のowner_statement |

AIによる要約は`owner_statement`本文を変更せず、別の`claim`または`review`として`interpretation_of`で接続する。

raw session logは保存しない。

mi3sanの原文を保存する場合は、mi3sanが保存を承認した必要部分だけを秘密情報と個人情報の検査後に`owner_statement`へ記録する。

### 10.5 Evidence manifest固有property

Evidence manifestは証拠の同一性と可用性を分けて記録する。

| Property | Type | 意味 |
|---|---|---|
| `evidence_kind` | text | `EXPERIMENT_RESULT`、`ARTIFACT`、`COMMIT`、`SOURCE` |
| `project_ref` | text | 出典project |
| `repository_url` | text | canonical repository URL |
| `commit_sha` | text | immutableな完全SHA |
| `artifact_uri` | text | artifactの取得先 |
| `artifact_hash` | text | artifactのdigest |
| `hash_algorithm` | text | hash方式 |
| `custodian` | text | 保管責任者 |
| `access_boundary` | text | 閲覧権限 |
| `retention_until` | date | 保持期限 |
| `availability_status` | text | `AVAILABLE`、`AT_RISK`、`MISSING` |
| `last_verified` | date | 最終到達確認日 |
| `source_license` | text | 再利用条件 |

force-push、repository削除、link rot、保管期限切れへの対応はEvidence manifest本文へ記録する。

### 10.6 型別制約

`schema_version`ごとに、`note_type`別の必須property、禁止property、許可relationを定義する。

最低限、次を検査対象にする。

- `evidenced_by`の終点は`evidence_manifest`である。
- `interprets`の終点は`owner_statement`である。
- `decision_status: ACCEPTED`、`REJECTED`、`SUPERSEDED`は有効な`decision_ref`と`authority_refs`を持つ。
- `claim_kind: OWNER_DIRECTIVE`は`note_type: owner_statement`だけで使用でき、有効な`authority_refs`を持つ。
- `decision_status: REJECTED`と`workflow_stage: ACTIVE`を同時に使わない。
- `decision_status: ACCEPTED`と`workflow_stage: INBOX`を同時に使わない。
- `evidence_status: OBSERVED`は到達可能な`evidenced_by`を一件以上持つ。
- 同じ`id`が二つのnoteへ付与されていない。
- enum外の値を使用していない。
- 存在しない内部linkを必須relationに使っていない。

Obsidian Propertiesは意味制約を検証しない。

Community Pluginではなく、将来のPoC-Aでrepository CIの軽量validatorを比較する。

validatorは不正構造を拒否するだけで、自動昇格や自動採択を行わない。

証拠品質を評価する場合は`evidence_status`へ混ぜず、Evidence manifest本文のrubricまたは将来の`evidence_quality`で扱う。

## 11. Stable IDとfile name

IDはbranch間で衝突しないprefix付きULIDを推奨する。

候補形式は次とする。

- `ACT-01K0...`
- `KNO-01K0...`
- `EVD-01K0...`
- `DEC-01K0...`
- `CYC-01K0...`
- `PRJ-01K0...`

file nameは`<id>-<short-slug>.md`とする。

名称、domain、stateが変わってもIDを変更しない。

中央の連番registryは初期PoCで使用しない。

## 12. Link relation vocabulary

relationは方向を持つlist propertyとして保存する。

| Relation | 意味 | 逆関係 |
|---|---|---|
| `derived_from` | 出典または前提から導いた | `derives` |
| `supports` | 証拠または論拠として支える | `supported_by` |
| `contradicts` | 同時に成立しない反証を示す | `contradicted_by` |
| `refines` | 条件や精度を追加する | `refined_by` |
| `generalizes` | 適用範囲を広げる | `specializes` |
| `applies_to` | project、domain、problemへ適用する | `has_application` |
| `fails_under` | 失敗条件を指す | `failure_of` |
| `evidenced_by` | Evidence manifestを指す | `evidence_for` |
| `tested_by` | 実験またはTransfer Testを指す | `tests` |
| `supersedes` | 旧ノートを置換する | `superseded_by` |
| `depends_on` | 成立に必要な知識を指す | `required_by` |
| `interprets` | 原文に対する解釈を指す | `interpreted_by` |

初期PoCでは、`derived_from`、`supports`、`contradicts`、`applies_to`、`fails_under`、`evidenced_by`、`tested_by`、`supersedes`だけを実装候補とする。

relationの逆辺を手作業で二重管理しない。

Basesや将来のvalidatorが必要とする場合だけ、派生viewで逆関係を計算する。

## 13. 横断パターン昇格モデル

横断パターンは、読みやすさや複数LLMの同意だけでは昇格しない。

### 13.1 Candidate

AIまたは人が`Inbox`へ`PROPOSED`、`RISK`、`OBSERVED`候補を置く。

候補には出典と、事実か解釈かを明示する。

### 13.2 Project-grounded

少なくとも一つのproject、完全なcommit、artifactまたは実測への参照を持つ。

プロジェクト固有の失敗は、この段階ではproject実行SSOTが正本である。

Vaultには一般化候補だけを置く。

### 13.3 Bounded

適用条件、失敗境界、既知の反例、反証可能な問いを記録する。

条件が書けない知見は、原理ではなく未整理claimとして保持する。

### 13.4 Transfer-tested

元project以外のprojectまたは異なるdomainでTransfer Testを行う。

同じ文書を別の場所へ適用しただけではTransfer Testにならない。

入力、変更点、期待、artifact、結果、失敗理由を保存する。

### 13.5 Adversarially reviewed

ラピスが前提、証拠、候補漏れ、現状維持バイアス、反例を検査する。

アトラスは構築可能性、投資、接続境界への回答を別記録で残す。

合意できない争点は削除せず、Decision noteへ未決事項として残す。

### 13.6 Owner-decided

mi3sanが実artifactとレビューを比較し、採択、棄却、継続調査を決める。

採択時だけ`decision_status: ACCEPTED`へ変更する。

棄却時は理由と再検討条件を残し、`decision_status: REJECTED`へ変更する。

自動昇格は行わない。

## 14. 探索状態機械

状態遷移は次とする。

`BROAD_SCAN → FOCUSED_DEPTH → SYNTHESIS → TRANSFER_TEST → BROAD_SCAN`

### 14.1 BROAD_SCAN

問いの周辺にある候補、反例、隣接domain、既存方式を広く集める。

出力は候補map、除外理由、証拠不足、深掘り候補である。

方式を一つ選んだ時点では終了しない。

比較空間と停止条件を説明できた時点で`FOCUSED_DEPTH`へ進む。

### 14.2 FOCUSED_DEPTH

選んだ少数候補の前提、mechanism、実装可能性、証拠品質を深く調べる。

出力は原子claim、反証条件、Evidence manifest、未解決riskである。

追加調査が結論をほとんど変えない停止根拠を記録した時点で`SYNTHESIS`へ進む。

### 14.3 SYNTHESIS

複数claimを統合し、原理、モデル、pattern、anti-pattern候補を作る。

出力は適用条件、失敗境界、反例を持つ`PROPOSED`ノートである。

元projectの言葉を一般原理へ言い換えただけでは終了しない。

別条件で何が起きるかを予測できた時点で`TRANSFER_TEST`へ進む。

### 14.4 TRANSFER_TEST

元project以外で予測を試す。

成功、部分成功、失敗のいずれもEvidenceとして残す。

失敗した場合はpatternを守らず、適用境界の修正、棄却、または新しいBROAD_SCANを選ぶ。

結果と次の探索範囲を決めた時点で次の`BROAD_SCAN`へ戻る。

### 14.5 遷移権限

AIは次状態を提案できる。

mi3sanの承認を要する探索では、AIの提案だけで投資額、外部サービス、採択状態を変更しない。

### 14.6 例外遷移

主経路は維持し、次の後退、停止、棄却を許可する。

- `FOCUSED_DEPTH → BROAD_SCAN`
- `SYNTHESIS → FOCUSED_DEPTH`
- `TRANSFER_TEST → FOCUSED_DEPTH`
- 任意のactive状態から`PAUSED`
- 任意のactive状態から`ABANDONED`

後退時は、反証された前提、追加で必要な証拠、再開条件を記録する。

`ABANDONED`は失敗を削除せず、棄却理由と再検討条件を残す。

### 14.7 cycle予算と停止条件

各cycleは開始前に次を定義する。

- 調査予算
- 調査期間
- 候補追加の飽和条件
- 除外候補と除外理由
- 許容する残存不確実性
- 追加調査のValue of Information
- 停止判断者
- 再開条件

Transfer Testは期待結果、失敗条件、比較方法を実験前commitへ保存する。

結果を見た後に成功条件を変更する場合は、元条件を上書きせず新しいtestとして扱う。

## 15. 各プロジェクトとの接続方式

初期接続は、複製や自動同期を伴わないloose couplingとする。

Vault側の`project_ref`は次を持つ。

- repositoryのcanonical URL
- default branch
- `PROJECT_STATE`のpath
- architecture governanceとADRのpath
- artifact保管場所
- 任意のlocal checkout path
- 最後に確認したcommit

Knowledge noteは`evidenced_by`だけを持つ。

Evidence manifestが`project_ref`、完全なcommit SHA、repository内pathで出典を固定する。

branch名や`main`の最新状態だけを出典にしない。

接続方式は次の三案を比較する。

1. Vault側だけに`project_ref`を持つ。
2. project側にも薄い接続fileを置く。
3. project ADRから必要なKnowledge IDだけを参照する。

PoC-Aでは一案目を採用し、project repositoryを変更しない。

二案目と三案目は、project側からVaultへ到達する具体的な必要性が確認された後に判断する。

接続fileを採用する場合も、知識本文を複製しない。

初期方式としてsubmodule、subtree、双方向syncは採用しない。

大容量artifactはprojectまたはartifact storeへ残し、Vaultにはhash、形式、閲覧手順、immutable linkだけを置く。

PR #18から抽出する場合、未mergeのbranch HEADを永続出典にしない。

squash merge後の`main`上のcommit、PR URL、該当pathをEvidence manifestへ記録する。

## 16. Git運用

Vaultはprivate repositoryとする。

`main`は共有可能な履歴の正本とする。

AIは作業branchで`PROPOSED`候補を追加し、PRで差分を提示する。

AIが作成したPRをmergeできることと、知識を採択できることを分ける。

mi3sanによる`decision_status`変更の承認はDecision noteへ記録する。

権限保証は次の二案を比較する。

### 16.1 案A 強い権限保証

- protected `main`
- restricted pathへのCODEOWNERS
- schema validator
- AIが利用できないowner専用署名
- signed Decision note
- negative test
- AIは`PROPOSED` branchだけを作成

owner stateを運用する前に必要な候補である。

設定と日常運用のcostは高い。

### 16.2 案B 軽量な手続き保証

- PoC-Aでは`PROPOSED`だけを作成
- owner stateをPoC-Aの書込対象外にする
- merge前にmi3sanが差分を手動確認する
- 機械保証ではなく運用規約であると明記する
- decision transition validatorは後続判断にする

PoC-Aでは案Bを推奨する。

owner stateを実運用へ入れる前に、案Aまたは同等のattestationを再評価する。

AIとmi3sanが同じGitHub identityを使う限り、案Bは本人性を機械保証しない。

### 16.3 初期のbranch運用

推奨する初期運用は次である。

- 一つの原子知識または一つのschema変更を一PRにする。
- squash mergeを既定にし、PR本文に出典とdecision変更を記載する。
- renameではIDを保持する。
- 削除ではなく`SUPERSEDED`または`REJECTED`を使う。
- merge前にcredential、個人情報、broken link、property typeを検査する。
- `.obsidian/workspace*.json`、cache、端末固有状態はcommitしない。
- 共有すべきCore Plugin設定とtemplateだけを選択的にcommitする。
- Community Plugin本体とplugin dataは、個別承認があるまでcommitしない。

同じVaultを複数端末から同時編集する場合の競合解決はPoC後の別Goalとする。

Obsidian SyncとGitの併用は、自動同期を導入する別判断として扱う。

### 16.4 Backupとdisaster recovery

private remoteだけを唯一の復旧元にしない。

少なくともremote、local clone、offline backupの責務を分ける。

backupには秘密情報を含めず、暗号化とaccess boundaryを定義する。

PoC-Aでは既知commitから一時directoryへ復元し、Obsidianで開いてID、Properties、link、Decision historyを確認する。

account lockout、repository deletion、誤削除を想定し、復旧元、復旧責任者、確認頻度をGoal承認後のPlanで決める。

## 17. credentialと個人情報の除外規則

private repositoryであっても、次を保存しない。

- `.env`
- API key
- access token
- refresh token
- password
- private key
- cookie
- credentialを含むURL
- raw prompt
- raw session log
- 住所、電話番号、個人メール、決済情報
- 顧客または第三者の非公開データ

証拠に秘密情報が含まれる場合は、redacted artifactをproject側へ作り、Vaultはredacted版だけを参照する。

除去前の値をhash化してVaultへ保存しない。

hashが照合攻撃や個人識別に使える場合があるためである。

owner statementはraw prompt全体ではなく、mi3sanが保存を承認した指示部分だけを記録する。

AIの解釈は原文と同じnote bodyへ上書きせず、別ノートとして接続する。

## 18. Community Plugin導入境界

初期PoCはRestricted Modeを維持し、Core Pluginだけを使う。

Properties、Backlinks、Outgoing links、Search、Templates、BasesでPoCを構成する。

Community Pluginは、Core PluginだけではPoCの成功条件を満たせない具体的なgapが見つかった場合だけ提案する。

提案には次を必要とする。

- 解消するgap
- pluginなしの代替
- authorとrepository
- license
- maintenance状況
- file accessとnetwork access
- 追加programの導入有無
- 送信データ
- version固定方法
- 無効化時のfallback
- 独立security review
- mi3sanの個別承認

複数pluginを一括承認しない。

一つずつ隔離環境で検査する。

plugin導入を知識整理の進捗として数えない。

### 18.1 Obsidian公式仕様から採用した制約

Obsidian Propertiesは、同じproperty名へVault全体で同じ型を割り当てる。

また、標準Propertiesは入れ子構造とMarkdownをproperty valueで扱う用途に向かない。

このため、schemaは単純なtextとlistを中心にし、長い説明を本文へ置く。

Obsidian BasesはCore Pluginであり、viewの元データをMarkdownとPropertiesに保持する。

このため、Basesを派生物として削除可能に保ち、Basesだけに知識を保存しない。

ObsidianはWikilinkとMarkdown linkを扱えるが、block referenceは標準Markdownではない。

このため、正本間の参照はstable note IDとfile単位を基本にし、block referenceを必須契約にしない。

Obsidian Community PluginはObsidianと同じaccess levelを継承し、file access、network connection、追加programの導入が可能である。

このため、PoCではRestricted Modeを維持する。

設計根拠は次の公式文書とする。

- [Properties](https://obsidian.md/help/properties)
- [Introduction to Bases](https://obsidian.md/help/bases)
- [Internal links](https://obsidian.md/help/Linking%2Bnotes%2Band%2Bfiles/Internal%2Blinks)
- [Plugin security](https://obsidian.md/help/Extending%2BObsidian/Plugin%2Bsecurity)

## 19. PR #18の修正方針

PR #18は未mergeのまま、次の境界へ修正する。

### 19.1 残すもの

- `LLM_GUIDE.md`を`neko-tera-video`固有の実行ガイドとして残す。
- `PROJECT_STATE.md`、architecture governance、ADR、anti-pattern ledgerへの読み順を残す。
- Codex、Claude、Copilotの薄いproject入口を残す。
- project内で採択済みの権限境界、比較契約、検証規約を残す。

### 19.2 修正するもの

- `LLM_GUIDE.md`が複数project横断の知識SSOTであるという表現を削除する。
- `AGENTS.md`、`CLAUDE.md`、Copilot入口、Serena memoryの「共有SSOT」をproject-localな実行ガイドへ言い換える。
- cross-projectに再利用できるという理由だけで、project-local guideを普遍規約として扱わない。
- 独立Vaultが承認されるまでは、存在しないVault pathを必読依存へ追加しない。

対象fileと修正意図は次とする。

| File | 修正意図 |
|---|---|
| `LLM_GUIDE.md` | titleと冒頭をproject-localな実行SSOTへ変更し、各modelはこのprojectでの適用規約として残す |
| `AGENTS.md` | 「複数LLMが使うproject-local guide」とし、cross-project SSOTという読め方を除く |
| `CLAUDE.md` | project入口のまま維持し、正本の範囲を`neko-tera-video`に限定する |
| `.github/copilot-instructions.md` | project入口のまま維持し、正本の範囲を`neko-tera-video`に限定する |
| `README.md` | 「LLM共通」を「本projectを扱うLLM向け」へ変更する |
| `PROJECT_STATE.md` | `LLM_GUIDE.md`をproject実行規約として記載する |
| `.serena/memories/core.md` | provider-neutral cross-project SSOTという記述を削除する |
| `.serena/memories/shared_llm_guide.md` | project-local参照memoryへ改名または内容変更する |
| PR #18 titleとbody | cross-project知識の完成を主張せず、project実行ガイドとVault移行方針を説明する |

### 19.3 Vaultへ抽出する候補

次の項目は、PR #18から一項目ずつ`PROPOSED`として抽出する候補である。

- 事実と権限状態を分けるモデル
- Goal、Plan、Implementation、Validation、Decisionの境界
- 異種方式を比較する三層契約
- base representationとenhancement layerの二軸分類
- conformanceとevaluationの分離
- Artifact Contract
- 固定予算と到達品質の二track
- 長時間jobの状態機械
- 失敗からmechanical gateへの昇格
- session handoff model

これらを一つの`LLM_GUIDE.md`としてVaultへ複製しない。

出典をPR #18の最終commitへ固定し、各候補に適用条件、失敗境界、反例、Transfer Testを追加する。

### 19.4 修正タイミング

このGoalとラピスレビューをmi3sanが承認した後に、PR #18の本文とファイルを修正する。

Goal承認前に`LLM_GUIDE.md`をcross-project knowledgeへ自動分割しない。

## 20. PoCの分割と成功条件

PoCはGoal承認後に実施する。

Vault機構の検証と知識のTransfer Testを別PoCにする。

### 20.1 PoC-A Vault機構

独立private repositoryで、Community Pluginを使わず最小構成を検証する。

正常系は次をすべて満たす。

1. ObsidianがRestricted ModeのままVaultを開ける。
2. 一つの`project_ref`と三つ以下の`PROPOSED` Knowledge候補を作成できる。
3. Knowledge候補がPR #18の同じ文章を複製せず、Evidence manifestへ遡れる。
4. 複数domainを持つnoteをProperties、Search、Basesから取得できる。
5. relationから出典、反例、将来のTransfer Test定義へ到達できる。
6. AI作成候補を`decision_status: PROPOSED`のままmergeできる。
7. mergeを`ACCEPTED`と誤認しない。
8. mi3sanが保存範囲を指定して手動作成した最小owner statement fixtureと、AI解釈を別記録として比較できる。
9. Git clone、Obsidian編集、diff、commit、再openのround tripでPropertiesとlinkが壊れない。
10. secretと個人情報の検査で指摘がない。
11. Vaultを削除しても各projectの実行と再現性が壊れない。
12. 既知commitから別directoryへ復元し、Obsidianで再度開ける。

negative testでは、次の違反を検出または手順上拒否できることを確認する。

- AIが`decision_status: ACCEPTED`へ変更する。
- 架空の`authority_refs`を設定する。
- projectとVaultへ同一本文を複製する。
- enum外のproperty値を設定する。
- 存在しないEvidenceへ必須linkを作る。
- 同じIDを二つのbranchから作る。
- canonical noteをArchiveへ移して外部参照を壊す。
- 疑似credentialを置く。

案Bを採用するPoC-Aでは、owner本人性の拒否はCIによる完全保証ではなく、mi3sanの手動reviewで確認する。

機械保証できない項目を成功扱いにする場合は、その限界をPoC結果へ明記する。

AIはPoC-A用のowner statement fixture本文を作成しない。

mi3sanが作成したfixtureをread-only入力として参照する。

### 20.2 PoC-B Knowledge Transfer Test

PoC-Aとは別に、一つのKnowledge候補を元project以外で検証する。

実験前commitへ次を保存する。

- 対象Knowledge ID
- 元projectと対象project
- 期待結果
- 失敗条件
- 比較方法
- 変更可能な条件
- 固定する条件
- artifactと計測方法
- 停止条件

成功、部分成功、失敗を同じEvidence schemaで保存する。

PoC-Bの失敗はVault機構の失敗と自動的に同一視しない。

失敗はKnowledge候補の適用境界、反例、棄却判断へ戻す。

### 20.3 共通の失敗条件

次のいずれかが起きた場合は該当PoCを失敗とする。

- projectの現在状態をVaultへ移さないと運用できない。
- 同じ知識本文をprojectとVaultへ複製しないと検索できない。
- Community Pluginなしでは基本的な候補管理を行えない。
- AIによるowner state変更をowner承認と誤認する。
- 出典commitまたはartifactへ遡れない。
- 証拠の同一性は分かるが、可用性と保管責任が不明である。
- Transfer Testの失敗を削除または上書きする。

## 21. mi3sanへ提示する未決事項

| ID | 未決事項 | アトラス推奨 |
|---|---|---|
| `KV-GOV-001` | remote repositoryのownerとslug | `wit-maker/mi3san-knowledge`のprivate repository |
| `KV-GOV-002` | note本文とfile nameの言語 | 本文は日本語、property keyとslugは英語 |
| `KV-GOV-003` | stable ID方式 | note型prefix付きULID |
| `KV-GOV-004` | `.obsidian`のcommit範囲 | Core Plugin設定とtemplateだけを選択commit |
| `KV-GOV-005` | attachment上限 | 初期PoCは小さな画像だけ、動画とmodelは外部参照 |
| `KV-GOV-006` | 最初の抽出候補 | 状態モデル、conformance分離、長時間job状態機械 |
| `KV-GOV-007` | 最初のTransfer Test対象 | `neko-tera-video`以外の実projectを一つ指定 |
| `KV-GOV-008` | owner statement保存 | mi3sanが指定した抜粋だけを保存し、raw promptは保存しない |
| `KV-GOV-009` | Community Plugin既定 | Restricted Modeを維持し、default deny |
| `KV-GOV-010` | mergeと採択の関係 | mergeとknowledge stateを分離 |
| `KV-GOV-011` | project接続 | PoC-AはVault側`project_ref`だけ、project側fileは必要性確認後 |
| `KV-GOV-012` | Goal文書の移管 | Vault初期化時に本書を移管し、project側には接続契約だけを残す |
| `KV-GOV-013` | `LLM_GUIDE.md`の権威境界 | project固有規約だけを実行SSOTとし、横断知識本文は複製しない |
| `KV-GOV-014` | 権限保証の強度 | PoC-Aは案B、owner state導入前に案Aを再評価 |
| `KV-GOV-015` | 状態schema | evidence、decision、workflow、authorityを分離 |
| `KV-GOV-016` | ID衝突対策 | prefix付きULIDを採用 |
| `KV-GOV-017` | PoC分割 | PoC-A機構検証とPoC-B Transfer Testを分離 |
| `KV-GOV-018` | canonical noteの移動 | path固定、廃止はpropertyとtombstoneで表現 |
| `KV-GOV-019` | Evidence retention | identity、availability、保持期限、custodianを分離 |
| `KV-GOV-020` | schema validation | Community PluginではなくCI validatorをPlan候補にする |
| `KV-GOV-021` | Vault復旧方針 | remote、local clone、offline backupを分け、既知commitから復元試験 |
| `KV-GOV-022` | 探索の例外遷移 | nominal cycleを維持し、後退、停止、棄却を追加 |
| `KV-GOV-023` | Goal承認後のPR #18出典 | squash merge後の`main` commitとPR URLをEvidence正本にする |
| `KV-GOV-024` | Evidence relationの正本名 | `evidenced_by`へ統一 |
| `KV-GOV-025` | Transfer Test relationの正本名 | `tested_by`へ統一 |
| `KV-GOV-026` | restricted transition | `ACCEPTED`、`REJECTED`、`SUPERSEDED`、`OWNER_DIRECTIVE`をowner authority必須にする |
| `KV-GOV-027` | `OBSERVED`の最低条件 | 到達可能なEvidence manifestを必須にする |
| `KV-GOV-028` | PoC-Aのowner statement | mi3sanが指定して手動作成した最小fixtureをread-only参照する |

## 22. Goalの完了条件

次を満たした時点でGoal段階を完了する。

- アトラス案が本書に記録されている。
- ラピスの敵対的レビューが別記録に残っている。
- アトラス案とラピス指摘が混ぜられていない。
- 未決事項と推奨案がmi3sanへ提示されている。
- mi3sanがPoCへ進む範囲を明示承認している。

mi3sanの承認前は、すべての設計候補を`PROPOSED`として維持する。
