# PROJECT_STATE

最終更新: 2026-07-25

## 現在の状態

- **現行動画は納品成立済み**。全42カットのQC、outro反映、全編デコード、独立計測が完了している。
- 最終成果物: `out/final-master.mp4`
  - H.264 1080×1920 / 60fps + AAC 48kHz stereo
  - 映像303.900秒 / 音声303.916秒 / 差0.016秒
  - Integrated Loudness -14.0 LUFS / AAC True Peak -1.4 dBTP
  - SHA-256: `0753B72BF606FB89F6AECAF951F27C615B5E8EA8BFE8BDDED1730A4B50BA85BF`
- 検収証跡: `docs/qc-delivery-task-board.md`、`docs/qc-report.md`
- 現行口パッチは保守対象かつ次期比較のbaselineであり、次期表現方式の制約にはしない。

## 次の段階

- PR #17でラピスの再レビューを受領した。初回12項目は解消され、追加5項目を戦略v0.3へ反映した。
- mi3sanは `GOV-013`〜`GOV-016`を承認し、`docs/adr/001-next-character-comparison-boundaries.md`へ記録した。
- PR #19は `main` の `d1d1143` に統合済みであり、**P0a evidence foundation**（現行方式Aの再現可能な証跡vertical slice）を完了した。固定入力検証、baseline、manifest、conformance/evaluation分離、review、negative test、local font、network遮断再現が含まれる。
- P0aのconformanceは品質合格・方式採択を意味しない。本来Goalである、方式ごとのnative assetによる複数表現アーキテクチャの実映像比較とmi3sanによる次期方式選定は未達である。
- M0 Program controlは `M0-05`（承認済み一時resourceの削除）を除いて受入済みである。M1 P0b Comparison Contractは契約実装（`M1-01`/`M1-02`）まで完了し、実artifact接続（`M1-04`〜`M1-06`）はP1のnative assetを待つ。
- M3では `M3-00` P1 Track A run definition（PR #25）と `M3-01` Blender 4.5 LTS portable provision（PR #23）が受入済みである。ただし `pipeline/m3/p1-track-a-run-definition.json` は `status: PROPOSED` であり、budgetは未確定である。
- **現在のcritical path上の唯一のblockerは `M3-03`**（P1 Track Aの固定制作上限をmi3sanが承認すること）である。承認まで `M3-02` 以降のnative asset / renderカードを開始しない。
- P0bではCharacter Bible、Performance Intent / Observable Reference / Adapter Native Controls、方式別native asset contract、artifact/provenance、conformance/evaluation境界、comparison presentationを扱う。同じ完成PNGやtopologyを全方式へ強制しない。
- N0 Neural FeasibilityはN0-0 local inventoryを実行済みである。RTX 3060 Ti 8GB、Node、Dockerはローカル証跡として検出された一方、repository-local model/weight candidateとlicense declarationは未検出であり、決定状態は `blocked-awaiting-owner-external-approval` である。P1 Mechanism Evidenceは未開始である。P2 Styled Comparison、P3 Production Slice、条件付きP4 Neural Enhancement、最終選定・本番移行は後続stage gateであり、自動開始しない。
- 三層Motion Contract、候補二軸、P0b以降の詳細schema、ツール採用は引き続き `PROPOSED` のPoC限定作業契約であり、採択済みアーキテクチャ、恒久ADR、OSS public contractではない。
- PR #18、Obsidian横断知識Vault、Knowledge抽出、Community Plugin、自動同期は別streamであり、このcharacter比較プログラムのcritical pathに含めない。as-isでmerge・編集しない。

1. オービットがM0/M1を、既存SSOTとP0a証跡を再作成・複製しない最小task packetとして進める。
2. P0b受入後、N0はmodel/weight/datasetの取得元・license・用途・費用・送信data・local代替・停止条件をmi3sanが明示承認した場合だけlocal spikeへ進める。P1は別途のstage gateでnative asset、license、費用、外部取得の一括判断を提示する。
3. N0/P1以降は各stage gateの受入とmi3sanの候補残留/棄却判断を満たしてから進める。P2〜P4をこの段階で実装開始しない。
4. 実験後の観測済み失敗から一般化できる知見は `docs/anti-patterns.md` へ追記し、再発可能ならvalidator、test、ADR、DoDへ昇格する。

## 入口

- 次期技術戦略: `docs/character-architecture-strategy.md`
- 判断状態とhard blocker: `docs/architecture-governance.md`
- 採択済み比較境界: `docs/adr/001-next-character-comparison-boundaries.md`
- 環境拡張の段階案: `docs/tooling-extension-strategy.md`
- 永続アンチパターン: `docs/anti-patterns.md`
- 現行動画の詳細設計・旧教訓: `docs/cto-handoff.md`
- 完了した納品工程: `docs/qc-delivery-task-board.md`
