# アンチパターン台帳

最終更新: 2026-07-23

## 目的

この台帳は失敗者を記録する場所ではない。実装、制作、比較、運用で実際に起きた失敗から、再発防止可能なパターンを抽出し、将来の担当者が同じ探索コストを払わずに済むようにするための永続資産である。

既存動画制作で起きた11件の詳細は `docs/cto-handoff.md` §17.1、一般化した教訓は同 §17.2 にある。本台帳は、それらを含む今後の知見の**参照入口と更新先**である。

## 記録する条件

次のすべてを満たすときに記録する。

1. 実際の失敗、誤判定、無効な成果物、または再現不能が観測された。
2. 根本原因を、単なる「注意不足」より具体的に説明できる。
3. 別のタスク、方式、担当者でも再発し得る。
4. 禁止パターンまたは代替策を明文化できる。

失敗していない仮説上のリスクは、ここではなく戦略文書やリスク台帳へ置く。

## 1件の必須項目

| 項目 | 内容 |
|---|---|
| ID | `AP-###`。一度使った番号は再利用しない |
| 状態 | `active` / `superseded` |
| 観測日 | `YYYY-MM-DD` |
| 文脈 | どの工程・方式・成果物か |
| 観測事実 | 解釈を混ぜず、何が失敗したか |
| 証拠 | コマンド、実測値、still、ログ、差分、再現手順への参照 |
| 根本原因 | なぜ検出・防止できなかったか |
| 禁止パターン | 今後してはいけないこと |
| 代替策 | 先に測ること、テスト、ゲート、設計変更 |
| 適用範囲 | 全体 / 特定方式 / 特定OSなど |
| 昇格先 | ADR、validator、テスト、受入条件など。なければ理由 |

## 運用

- 着手時: 関連するIDをタスクまたはPoC manifestへ列挙する。
- 失敗発生時: まず証拠を保存し、原因を切り分ける。推測段階では `根本原因` を確定扱いしない。
- 完了時: 再利用可能な知見があれば追記し、機械的な防止策へ昇格したことを確認する。
- レビュー時: 「台帳へ書いたか」だけでなく、「同じ失敗を次回止めるゲートがあるか」を確認する。
- 更新時: 過去の項目は削除・書換えで歴史を消さない。前提変更は新IDを作り、旧IDを `superseded` にする。

## Active

### AP-001: 検証していない仮定を事実として工程へ流す

- 状態: `active`
- 観測日: 2026-07-21以前
- 文脈: 画像座標、素材構図、スコープ調査、ラウドネス判定
- 観測事実: 目視座標の誤読、非stand発話カットの見落とし、昼夕素材の構図差の見落とし、トゥルーピーク原因の誤説明が起きた。
- 証拠: `docs/cto-handoff.md` §17.1 #1, #3, #5, ADR-9
- 根本原因: 仮定を検証する独立計測がDoDに含まれていなかった。
- 禁止パターン: 「同じはず」「対象なし」「原因はこれ」と、反証手順なしに確定する。
- 代替策: スキーマ適用後のデータ、ピクセルプローブ、独立再測、反例fixtureを受入条件に入れる。
- 適用範囲: プロジェクト全体
- 昇格先: `docs/qc-procedure.md`、validator、独立計測コマンド

### AP-002: 最終表示系ではない中間物だけで視覚品質を合格にする

- 状態: `active`
- 観測日: 2026-07-21以前
- 文脈: インペイント、字幕、口パッチ
- 観測事実: ピクセル等倍や素材単体では見逃した破綻が、実表示スケールの合成結果に現れた。
- 証拠: `docs/cto-handoff.md` §17.1 #7, #11
- 根本原因: 中間成果物の妥当性と、納品表示の知覚品質を同じ判定として扱った。
- 禁止パターン: 素材単体、拡大表示、数値だけを根拠に最終視覚品質を合格にする。
- 代替策: 通常速度、25%速度、実表示、200%口元、合成後stillを共通検収物にする。
- 適用範囲: 全レンダリング方式
- 昇格先: 比較artifact contractとQC checklist

### AP-003: ジョブの終了通知を成果物の成功と同一視する

- 状態: `active`
- 観測日: 2026-07-21以前
- 文脈: Remotion全編レンダー
- 観測事実: 起動に失敗したバックグラウンドジョブが完了通知では exit 0 と見えた。
- 証拠: `docs/cto-handoff.md` §17.1 #8
- 根本原因: 起動確認、プロセス生存、成果物検証が一つの曖昧な「実行完了」にまとめられていた。
- 禁止パターン: exit codeまたは通知だけで長時間レンダーを合格にする。
- 代替策: 起動確認と完了確認を分離し、完了後にファイル実在、サイズ、フレーム数、尺、デコードを検証する。
- 適用範囲: 長時間ジョブ、外部レンダラー、学習ジョブ
- 昇格先: 実験runnerの状態機械とartifact validator

### AP-004: 素材契約に存在しない構造をレンダラー側だけで捏造する

- 状態: `active`
- 観測日: 2026-07-23
- 文脈: 現行の局所口パッチ方式
- 観測事実: 完成PNGには顎関節、隠れ領域、口腔、変形余白がないまま、レンダラーが局所口画像と姿勢別anchorを上から合成した。その結果、口が顔へ貼り付いたように見える、境界haloが出る、姿勢ごとの位置補正が増えるという破綻が実際の映像とQCで観測された。
- 証拠: `src/components/Character.tsx` の局所パッチ合成、`docs/cto-handoff.md` §17.1 #6, #7, #10, #11
- 根本原因: 表現に必要な構造を素材契約へ持たせず、完成画像に対する局所差し替えと座標補正だけで回収しようとした。
- 禁止パターン: 素材にない関節、隠れ面、口腔、変形余白を、レンダラー側の画像パッチと個別座標だけで再構築する。
- 代替策: 先に表現方式を選び、その方式のネイティブ素材契約へ必要なレイヤー、骨格、メッシュ、口腔、隠れ領域、変形余白を含める。既存完成PNGの流用はbaselineまたは変換実験として明示する。
- 適用範囲: キャラクター表現と、素材にない構造を後段で補う画像合成
- 昇格先: 素材contract、adapter受入条件、最終表示QC

### AP-005: アンチパターンを記録しただけで再発防止したとみなす

- 状態: `active`
- 観測日: 2026-07-23
- 文脈: 本台帳の運用
- 観測事実: 旧教訓は詳細に残っていたが、将来タスクの必読入口や追記規約がなかった。
- 証拠: 旧記録は `docs/cto-handoff.md` §17に存在し、入口規約は本変更前に存在しなかった。
- 根本原因: 知識の保存と、工程への強制を同じものと考えた。
- 禁止パターン: 教訓を文章へ追記するだけで、テスト・ゲート・受入条件を更新しない。
- 代替策: 再発を機械的に止められる項目は、同じ変更でvalidator、テスト、テンプレート、ADR、DoDのいずれかへ昇格する。
- 適用範囲: プロジェクト全体
- 昇格先: `AGENTS.md` の完了条件

### AP-006: Windowsの既定コンソールencodingでUnicodeを出すCLIを実行する

- 状態: `active`
- 観測日: 2026-07-23
- 文脈: Serena memory参照整合性チェック
- 観測事実: `serena memories check` は検査後の `✓` をCP932へ出力できず、`UnicodeEncodeError` で終了した。`PYTHONUTF8=1` では同じ検査が完走し、参照不整合0件を確認できた。
- 証拠: 失敗コマンド `serena memories check`、成功コマンド `$env:PYTHONUTF8 = '1'; serena memories check`
- 根本原因: Python CLIがUnicodeを出力する一方、Windowsプロセスの標準出力encodingがCP932だった。
- 禁止パターン: Unicode出力を持つPython CLIを、Windowsの既定encodingへ無条件に出す。
- 代替策: 該当CLIはPowerShellで `$env:PYTHONUTF8 = '1'` を設定してから実行する。エラーをmemory内容の破損と誤診しない。
- 適用範囲: Windows上のSerenaおよび同種のPython CLI
- 昇格先: Serena memoryの推奨コマンド

### AP-007: 未観測の将来リスクを観測済みアンチパターンとして登録する

- 状態: `active`
- 観測日: 2026-07-23
- 文脈: PR #17初稿のアンチパターン台帳
- 観測事実: まだ行っていない「同じPNGを全方式へ投入する比較」の失敗を、観測済み失敗だけを対象とする台帳へAP-004として登録した。
- 証拠: PR #17の初稿と、それに対するラピスのRequest Changesレビュー
- 根本原因: `OBSERVED`、`PROPOSED`、`OPEN`の状態を文書横断で管理する仕組みがなく、妥当な将来リスクを観測事実へ昇格させた。
- 禁止パターン: 未実施の実験、理論上の懸念、将来の失敗可能性を、証拠のあるアンチパターンとして記録する。
- 代替策: 将来リスクは戦略文書またはリスク台帳へ `PROPOSED` / `OPEN` として置く。実際に失敗を観測してから、証拠を添えてアンチパターンへ登録する。
- 適用範囲: 設計、比較実験、リスク管理、知識管理
- 昇格先: `docs/architecture-governance.md` の状態モデルと、台帳の登録条件

### AP-008: 未承認の設計提案を永続規約へ先に昇格する

- 状態: `active`
- 観測日: 2026-07-23
- 文脈: PR #17初稿の戦略文書と `AGENTS.md`
- 観測事実: 戦略文書では提案・未決定だったRemotionの責務境界などを、オーナー承認前に `AGENTS.md` の「不変条件」として記載した。
- 証拠: PR #17初稿と、それに対するラピスのRequest Changesレビュー
- 根本原因: オーナー指示、レビュー上のguardrail、アーキテクチャ提案、採択済み決定の昇格条件を区別していなかった。
- 禁止パターン: 設計者の提案、レビューコメント、PoC仮説を、承認記録なしに永続ルールや実装前提へ移す。
- 代替策: 提案は戦略文書へ `PROPOSED` として残す。mi3sanの承認とADR記録を経た項目だけを `ACCEPTED_DECISION` として規約へ昇格する。
- 適用範囲: アーキテクチャ、運用規約、PoC、依存関係、ツール採用
- 昇格先: `docs/architecture-governance.md` と本 `AGENTS.md`

### AP-009: Local render assumed to be offline although the existing font loader performs network requests

- 迥ｶ諷・ `active`
- 隕ｳ貂ｬ譌･: 2026-07-23
- 譁・ц: P0 representation-A baseline render under the no-external-API constraint
- 隕ｳ貂ｬ莠句ｮ・: The existing `@remotion/google-fonts` loader made 121 requests for Yusei Magic and 124 requests for Klee One while rendering. The renderer was stopped and no output was accepted as a P0 artifact.
- 險ｼ諡: Remotion render log emitted by the approved local-checkout execution path on 2026-07-23.
- 譬ｹ譛ｬ蜴溷屏: Do not infer that a local binary or existing `node_modules` implies offline execution; runtime asset loaders can still access the network.
- 遖∵ｭ｢繝代ち繝ｼ繝ｳ: Do not render under a no-external-API contract until every runtime asset, including fonts, has a verified local-only resolution path. Stop at the first observed request.
- 莉｣譖ｿ遲・: Add a pre-render network-dependency gate or use an explicitly approved local font asset path before retrying. This P0 contract does not itself approve either change.
- 驕ｩ逕ｨ遽・峇: Remotion or browser-based render pipelines with remote font or asset loaders.
- 譏・ｼ蜈・: P0 stop condition and pre-render acceptance checklist.

## Superseded

現時点ではなし。
