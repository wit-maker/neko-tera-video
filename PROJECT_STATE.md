# PROJECT_STATE

最終更新: 2026-07-22

## 現在の状態

- **git 初期化済み**。`main` ブランチにブートストラップ(gitignore, CI)がコミット済み。
- **master 完成済み**: 全42カットが実素材でレンダー可能。`out/final-master.mp4` 生成済み。
  - フォーマット: h264 1080×1920 60fps + AAC 48kHz stereo。
  - 尺: 映像 303.98s / 音声 303.92s(尺差 0.063s、基準 ≤0.1s 内)。
  - ラウドネス: 統合 -14.0 LUFS(基準 -14 ±0.5 内)。
  - 成功条件 §2 のうち フォーマット・尺・ラウドネスは達成済み。
- 中間生成物も全て存在: `out/master.mp4`, `out/master-audio.wav`, `out/premaster.wav`, `out/mix-filter.txt`。

## 残作業

1. **QC 巡回**(唯一の大物 / 未実施): `out/final-master.mp4` を対象に `docs/qc-checklist.md` 準拠で全42カットを検分し、修正指示を `video.json` / 座標定義へ反映 → 該当工程のみ再実行 → 再検分。修正が出尽くしてから全編レンダー + encode を1回。
   - 必須判定: ミケ口パッチ縁のハロー / s1c1 右柱の埋め跡 / 先生 tea ポーズの口被覆(いずれも実寸視聴での知覚有無で採否)。
2. **outro.mp3 反映**(発注者の配置待ち、ブロッカー): 配置後 `npm run mix && npm run encode` のみ(レンダー不要)。mix ログに `[warn] BGM 未配置` が出ないことを完了条件とする。
3. **納品**: `final-master.mp4` + 検収報告(成功条件6項目の実測値・判定)。

出典: `docs/cto-handoff.md`(§16 PMへの申し送り事項)。
