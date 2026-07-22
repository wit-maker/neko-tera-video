# 進捗ログ

出典: `docs/cto-handoff.md`, `docs/tech-lead-plan.md`。事実のみを記録する。

## 2026-07-22

- リポジトリのブートストラップドキュメントを整備(README / PROJECT_STATE / feature_list / progress)。

## 2026-07-21 — CTO 引き継ぎ時点

- パイプライン工程を実装・実行済み: tts / align / cutout / mouthpatch / fixbg / sfxcue / typeset / mix / render / encode。
- `out/final-master.mp4` 生成済み(h264 1080×1920 60fps + AAC、尺差 0.063s、統合 -14.0 LUFS)。
- 成功条件のうち フォーマット・尺・ラウドネスは達成。口パク同期 / 字幕 / 黒板 / QC チェックリストは QC 巡回未実施のため未判定。
- 中間生成物(master.mp4 / master-audio.wav / premaster.wav / mix-filter.txt)も揃っている。
- 全編レンダー実測: 約35分(concurrency 自動)。

## 次のアクション

1. QC 巡回(全42カット検分)。
2. outro.mp3 反映(発注者の配置待ち)→ mix + encode。
3. 納品(検収報告付き)。
