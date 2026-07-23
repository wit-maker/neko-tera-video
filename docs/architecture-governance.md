# 次期キャラクター表現基盤: 判断状態とガバナンス

最終更新: 2026-07-23

状態: **運用規約**

最終決定者: mi3san

## 目的

提案、レビュー上の合意、観測事実、オーナー承認、正式決定を混同しないための状態管理規約である。

この文書は特定アーキテクチャを採用しない。何が決定済みで、何がまだ比較対象または仮説なのかを明確にする。

## 状態

| 状態 | 意味 | 実装を拘束するか |
|---|---|---|
| `OWNER_DIRECTIVE` | mi3sanが明示した目的・制約・判断方法 | する |
| `REVIEW_GUARDRAIL` | アトラスとラピスが比較の健全性に必要と認めた手続き上の防止策 | 比較設計だけを拘束する。方式選定は拘束しない |
| `PROPOSED` | アトラスの提案。ラピスの再レビューとmi3sanの判断待ち | しない |
| `OPEN` | 判断材料またはmi3sanの選択が不足 | しない |
| `EXPERIMENT_RESULT` | 再現可能な実験と証拠から得た事実 | 証拠の範囲だけを拘束する |
| `ACCEPTED_DECISION` | mi3sanが採用し、ADRで根拠・適用範囲・再検討条件を固定 | する |
| `REJECTED` | 採用しないと決定。理由と再検討条件を保持 | しない |
| `SUPERSEDED` | 後続判断に置き換えられた | しない |

## 昇格規則

- PR本文、レビューコメント、戦略文書だけでは `ACCEPTED_DECISION` にならない。
- `PROPOSED` から `ACCEPTED_DECISION` への昇格には、mi3sanの明示承認とADRが必要。
- 実験結果は、入力、環境、artifact、計測、既知の限界が保存された場合だけ `EXPERIMENT_RESULT` とする。
- 未観測の危険は戦略文書のリスクとして扱い、アンチパターン台帳へ入れない。
- `AGENTS.md` へ永続規約として書けるのは、`OWNER_DIRECTIVE`、方式非依存の `REVIEW_GUARDRAIL`、または `ACCEPTED_DECISION` だけ。
- `REJECTED` と `SUPERSEDED` は削除しない。将来同じ議論を繰り返さないため、理由と後継IDを保持する。

## 現在の判断台帳

| ID | 状態 | 判断 |
|---|---|---|
| GOV-001 | `OWNER_DIRECTIVE` | 方式名や理論だけで採否を決めず、各方式の実映像をmi3sanが比較する |
| GOV-002 | `OWNER_DIRECTIVE` | 方式ごとに、その方式が本来必要とするネイティブ素材を制作する |
| GOV-003 | `OWNER_DIRECTIVE` | 同じPNGを全方式へ強制しない |
| GOV-004 | `OWNER_DIRECTIVE` | 音素認識・時間同期を描画品質比較から分離する |
| GOV-005 | `OWNER_DIRECTIVE` | 再利用可能な失敗を永続アンチパターンとして継承する |
| GOV-006 | `REVIEW_GUARDRAIL` | 観測事実、将来リスク、設計仮説を分離する |
| GOV-007 | `REVIEW_GUARDRAIL` | 視覚品質は最終表示系、スロー、拡大、デバッグ表示を含む成果物で判定する |
| GOV-008 | `REVIEW_GUARDRAIL` | 視覚品質、制作量、計算資源、再現性、操作性、ライセンスを未合意の重みで早期統合しない |
| GOV-009 | `PROPOSED` | Performance Intent、Observable Reference、Adapter Native Controlsの三層契約 |
| GOV-010 | `PROPOSED` | benchmark validatorを表示層から独立させ、Remotionは検証済みartifactの提示に限定する |
| GOV-011 | `PROPOSED` | P0〜P4と早期N0 feasibility spikeの投資順序 |
| GOV-012 | `PROPOSED` | Base representation A/B1/B2/C/D/Eと、enhancement layer none/manual cleanup/neural redraw/neural residualの二軸分類 |
| GOV-013 | `ACCEPTED_DECISION` | P1の暫定最大視点をyaw ±15°、pitch ±10°とする |
| GOV-014 | `ACCEPTED_DECISION` | 最初の候補選定は事前レンダーだけとし、リアルタイム性能は後段で別評価する |
| GOV-015 | `ACCEPTED_DECISION` | P2では現行キャラクターの同一性、輪郭、毛並み、色面、口腔表現を最低限維持し、写実化は要求しない |
| GOV-016 | `ACCEPTED_DECISION` | RTX 3060 Ti 8GBのローカル実行を優先し、クラウド・有料利用はmi3sanの自発的明示または提案への明示承認がある場合だけ許可する |

`GOV-013`〜`GOV-016`の根拠、適用範囲、再検討条件は `docs/adr/001-next-character-comparison-boundaries.md` を正本とする。

## 判断時期

| ID | 判断時期 | 現在 |
|---|---|---|
| GOV-014 | P0計画前 | 決定済み |
| GOV-016 | P0計画前 | 決定済み |
| GOV-013 | P1実行前 | 前倒し決定済み |
| GOV-015 | P2計画前 | 前倒し決定済み |

## ADRの役割

ADRは方式の宣伝資料ではない。次を記録する。

- 決定した問い
- 採用・不採用・保留の候補
- 根拠にしたartifactと実測
- 適用範囲
- 既知の不利と失敗条件
- 再検討を開始する条件
- supersedeする旧判断

P0前blockerであるGOV-014とGOV-016は解消した。GOV-013とGOV-015も後続段階に先行して決定済みである。

三層Motion Contract、独立validator、候補二軸、stage構造はラピスの方向性承認を得たが、mi3sanによるアーキテクチャ採択ではない。P0計画で仕様と受入条件を具体化し、必要な項目だけ別ADRで `ACCEPTED_DECISION` へ昇格する。
