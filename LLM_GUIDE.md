# LLM共通設計運用ガイド

最終更新: 2026-07-23

対象: Codex、Claude、GitHub Copilot、そのほか本リポジトリを扱うLLM

この文書は、LLM製品に依存しない設計判断と作業規約の正本である。

Codex固有の入口は `AGENTS.md`、Claude固有の入口は `CLAUDE.md`、GitHub Copilot固有の入口は `.github/copilot-instructions.md` とする。

各入口には規則を複製せず、この文書への参照だけを置く。

プロジェクト固有の観測証拠は `docs/anti-patterns.md`、判断状態は `docs/architecture-governance.md`、現在地は `PROJECT_STATE.md` を正本とする。

## 作業開始時の読み順

1. `PROJECT_STATE.md`で現在地と次の担当役割を確認する。
2. `LLM_GUIDE.md`で共通の判断モデルを確認する。
3. `AGENTS.md`でプロジェクト固有の恒久規約を確認する。
4. `docs/anti-patterns.md`で対象作業に関係する観測済み失敗を確認する。
5. アーキテクチャ判断を伴う場合は `docs/architecture-governance.md`と該当ADRを確認する。

この順序を省くと、古い提案を決定済みと扱う事故や、完了済み工程を再実行する事故が起きやすい。

## 事実と判断の状態モデル

同じ文章に見えても、観測事実、将来リスク、設計提案、採択済み判断は工程への拘束力が異なる。

状態を明示しない情報は、実装要件として扱わない。

| 状態 | 意味 | 許される扱い |
|---|---|---|
| `OBSERVED` | 再現手順またはartifactで確認した事実 | 証拠の範囲で利用する |
| `RISK` | まだ起きていない将来の危険 | 実験または監視の対象にする |
| `OWNER_DIRECTIVE` | オーナーが明示した目的、制約、権限境界 | 対象範囲の作業を拘束する |
| `REVIEW_GUARDRAIL` | 比較や検証を健全に保つ手続き | 評価工程を拘束する |
| `PROPOSED` | 採択前の設計案 | 比較または計画の候補にする |
| `OPEN` | 判断材料またはオーナー判断が不足している問い | blockerの時期を明示する |
| `EXPERIMENT_RESULT` | 入力、環境、artifact、計測を保存した結果 | 保存した条件の範囲で利用する |
| `ACCEPTED_DECISION` | オーナーが承認し、ADRへ記録した判断 | 実装と運用を拘束する |
| `REJECTED` | 理由と再検討条件を残して不採用にした判断 | 勝手に復活させない |
| `SUPERSEDED` | 後続判断に置き換えられた判断 | 履歴として保持する |

`PROPOSED`から`ACCEPTED_DECISION`へ進むには、オーナーの明示承認とADRまたは同等の決定記録が必要である。

レビューで妥当と評価された案も、オーナー承認がなければ`PROPOSED`のままである。

アンチパターン台帳には`OBSERVED`だけを登録し、`RISK`を観測済み失敗へ読み替えない。

## Goal、Plan、Implementationの境界

作業段階を飛び越えると、未承認の仮説がタスクや恒久規約へ混入する。

### Goal

Goalでは、解く問題、比較対象、共通条件、方式固有条件、判断者、未決事項を整える。

Goalでは詳細な実装タスクや依存関係を確定しない。

### Plan

Planでは、合意済みのGoalを小さなvertical slice、依存関係、受入条件、証拠、停止条件へ分解する。

Planは`PROPOSED`を自動採択せず、実装前にオーナーが承認できる粒度へ落とす。

### Implementation

Implementationでは、承認済みPlanの範囲だけを実装する。

実装中にGoalの前提を変える必要が生じた場合は、作業を広げずGoalまたはPlanへ戻す。

### Validation

Validationでは、実行完了通知ではなく成果物を検査する。

失敗が再利用可能なら、証拠を保存してアンチパターンと機械的な防止策へ昇格する。

### Decision

Decisionでは、artifactと実測を根拠に採択、不採択、保留を記録する。

採択理由だけでなく、既知の不利、適用範囲、再検討条件もADRへ残す。

## 異種方式を比較する三層契約

異なる方式へ同じ内部操作を強制すると、方式の能力ではなく入力の不適合を測ることになる。

共通契約を次の三層へ分ける。

### Performance Intent

**Performance Intent**は、何を表現したいかを示す。

骨格名、parameter名、特定ソフトウェアの操作値は含めない。

### Observable Reference

**Observable Reference**は、結果として何を観測するかを示す。

各observableには、次の測定情報を付ける。

- `required`、`optional`、`unsupported`のいずれか
- 測定方法とversion
- coordinate space
- tolerance
- confidenceまたはmanual annotation
- 単一frameか時間区間か

測定不能や測定誤差を、方式の品質failureへ自動変換しない。

### Adapter Native Controls

**Adapter Native Controls**は、各方式がIntentを実現する内部制御である。

方式ごとのlayer、mesh、bone、parameter、key drawing、latentはここへ置く。

共通化するのは意図、観測、出力条件であり、内部構造ではない。

## 候補を二軸で分類する

基礎方式と追加工程を一列の候補に並べると、組み合わせ可能な技術が排他的に見える。

候補は少なくとも次の二軸へ分ける。

- **Base representation**：成果物の基礎構造を作る方式
- **Enhancement layer**：baseへcleanup、再描画、残差補正などを加える工程

manifestは`baseRepresentation`と`enhancementLayer`を別fieldで持つ。

全組み合わせの直積は作らず、baseで観測したfailureを改善できるlayerだけを追加する。

このモデルは、rendererとpost-process、言語モデルとretriever、生成器とvalidatorなど、合成可能な方式の比較にも使える。

## ConformanceとEvaluation

契約適合と成果物の良さは別の問いである。

**Conformance**は、schema、frame、hash、timebase、color、alpha、cameraなど、機械的に判定できる契約を検査する。

**Evaluation**は、自然さ、同一性、時間連続性、視覚品質、制作量、操作性などを評価する。

`conformance=pass`は、品質合格を意味しない。

conformanceとevaluationは、別artifact、別schema、別の合格語彙を使う。

validatorは表示層や生成器から独立させる。

独立させることで、表示不具合、生成不具合、検査不具合を切り分けられる。

## Artifact Contractを先に決める

比較を始める前に、成果物の正本と検査条件を決める。

最低限、次を固定する。

- timebase、frame 0、区間、丸め規則
- bit depth、pixel format、color、alpha
- camera、coordinate system、canvas、crop
- anti-aliasing、background composite
- 入力hash、source commit、tool version
- CPU、GPU、driver、時間、容量
- operator、経験、person-hours、manual correction
- licenseとprovenance
- success、failed、partialの状態

中間ファイルだけで最終品質を合格にしない。

最終表示、通常速度、slow、crop、debugを含む成果物を証拠にする。

## 二つの比較トラック

同じ予算の比較と、各方式の品質上限の比較は答える問いが違う。

### 固定予算トラック

人時、反復回数、計算資源、課金上限をそろえる。

このトラックは、現在の制約で採用しやすい方式を示す。

### 到達品質トラック

方式に適した技能と素材を与え、改善が飽和するまで制作する。

各cycleで次を保存する。

- 対象failure
- 追加人時と計算資源
- beforeとafterのartifact
- 改善した指標と改善しなかった指標
- 継続または停止の理由

停止根拠を保存しない「飽和」は、方式の品質上限を示さない。

二つのトラックで勝者が異なっても矛盾ではない。

## ツール拡張と権限

ツール数は進捗を示さない。

設計、実装、観察、修正、再検証のループを閉じる操作だけを追加する。

接続方式は、原則としてCLI、API、GUI automation、MCPの順に検討する。

CLIやAPIは入力、version、出力を記録しやすく、再現経路を残しやすい。

MCPは対話速度を上げられるが、権限境界と再現手順を別に設計する必要がある。

機能上可能であることと、実行権限があることを混同しない。

有料サービス、クラウド、外部API、credential送信は、用途、費用、送信データ、ローカル代替、停止条件を示して個別承認を得る。

沈黙、無料枠、過去の承認は、新しい利用の承認にならない。

## 長時間ジョブの状態機械

ジョブの開始、実行、生存、完了、成果物検証を一つの「成功」へまとめない。

最低限、次の状態を区別する。

1. command accepted
2. process started
3. process alive
4. process exited
5. artifact exists
6. artifact decodes
7. artifact satisfies conformance
8. artifact is evaluated

通知やexit codeだけで長時間ジョブを合格にしない。

成果物の実在、サイズ、frame数、duration、decodeを独立に確認する。

## 失敗を工程へ戻す

失敗記録は、次の条件を満たす場合だけアンチパターンへ昇格する。

1. 失敗、誤判定、無効な成果物、再現不能を実際に観測した。
2. 証拠を保存した。
3. 根本原因を単なる注意不足より具体的に説明できる。
4. 別の担当者や方式でも再発し得る。
5. 禁止パターンと代替策を示せる。

記録には、観測事実、証拠、根本原因、禁止パターン、代替策、適用範囲、昇格先を含める。

台帳への追記だけでは再発を止められない。

可能な場合は、同じ変更でvalidator、test、template、ADR、DoDのいずれかへ昇格する。

過去の失敗は削除せず、前提が変わった場合は`SUPERSEDED`と後継IDを残す。

## 共通アンチパターン

| アンチパターン | 問題 | 代替 |
|---|---|---|
| 未検証の仮定を事実として流す | 誤った前提が後工程で増幅する | 独立計測と反例fixtureを置く |
| 未観測リスクを失敗台帳へ入れる | 証拠と推論の境界が消える | `RISK`として管理し、観測後に昇格する |
| 未承認提案を恒久規約へ移す | 設計者の仮説が実装を拘束する | オーナー承認とADRを要求する |
| 同じ入力構造を異種方式へ強制する | 方式ではなく入力不適合を測る | 意図、観測、出力だけを共通化する |
| baseとenhancementを一列に並べる | 組み合わせ可能な方式が排他的に見える | 二軸の候補モデルを使う |
| conformance passを品質合格と呼ぶ | 契約適合が主観評価を上書きする | conformanceとevaluationを分ける |
| 中間成果物だけで品質を判定する | 最終合成で現れる破綻を見逃す | 最終表示系で検収する |
| ジョブ通知を成果物成功とみなす | 起動失敗や破損を見逃す | 状態機械とartifact検査を使う |
| 根拠のない点数で方式を並べる | 擬似精度が不確実性を隠す | 単位を定義するか質的階級を使う |
| ツール導入を進捗とみなす | 操作経路だけ増えて検証が閉じない | 判断材料の増加量で導入を選ぶ |
| providerごとに規則を複製する | 更新差分によって判断が分岐する | 共通SSOTと薄いprovider入口を使う |
| 台帳へ書くだけで終える | 同じ失敗が次回も通過する | 機械的なgateへ昇格する |

## 引き継ぎモデル

セッション圧縮や担当交代では、会話の要約より正本への参照を優先する。

引き継ぎには次を含める。

- 現在のGoalと作業段階
- branch、HEAD、PR、CIの実状態
- `ACCEPTED_DECISION`
- `PROPOSED`と`OPEN`
- 完了済み工程と再実行禁止事項
- 成果物と検証証拠
- blockerと判断時期
- 次の担当役割
- 与えられていない権限

「何をしたか」だけでなく、「次の担当者が何をしてよいか」を記録する。

古いhandoffに現在地を上書きせず、`PROJECT_STATE.md`を現在地の正本にする。

## 完了前の点検

- 状態ラベルと実際の承認状態が一致している。
- `PROPOSED`や`RISK`が恒久規約へ混入していない。
- conformanceとevaluationが別判定になっている。
- 最終成果物を独立に検査した。
- 長時間ジョブの完了とartifact成功を分けた。
- 再利用可能な失敗を台帳と機械的なgateへ反映した。
- credential、raw prompt、個人情報を記録していない。
- provider固有の記憶だけに重要判断を残していない。
- `PROJECT_STATE.md`と各memoryが正本を参照している。
- 次の担当者、次の段階、必要な承認が明示されている。
