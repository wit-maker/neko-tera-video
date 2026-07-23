# PROJECT_STATE

最終更新: 2026-07-23

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

1. `docs/character-architecture-strategy.md` をラピスが敵対的レビューする。
2. mi3sanが同文書 §15 の未確定事項を判断する。
3. 合意後、オービットがP0（比較プロトコル）をPoC・依存関係・受入条件へ分解する。
4. 失敗から一般化できる知見は `docs/anti-patterns.md` へ追記し、再発可能ならvalidator、test、ADR、DoDへ昇格する。

## 入口

- 次期技術戦略: `docs/character-architecture-strategy.md`
- 永続アンチパターン: `docs/anti-patterns.md`
- 現行動画の詳細設計・旧教訓: `docs/cto-handoff.md`
- 完了した納品工程: `docs/qc-delivery-task-board.md`
