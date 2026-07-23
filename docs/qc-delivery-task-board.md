# 猫寺会話劇 — QC・納品 タスクボード

## 最終検収サマリー

- 正式outro: 同一受領音源を48 kHz stereo MP3へ変換して `public/bgm/outro.mp3` に反映。元の44.1 kHz音源はGit管理外にバックアップ済み。
- mix / encode: 既存 `master.mp4` を再レンダーせず、各1回成功。BGM未配置警告なし。
- `final-master.mp4`: H.264、1080×1920、60fps、AAC 48 kHz stereo、495,418,678 bytes。
- 尺: 映像303.900秒、音声303.916秒、差0.016秒。
- 独立計測: Integrated Loudness -14.0 LUFS、AAC True Peak -1.4 dBTP。受入基準に適合。
- QC: 全編デコード、字幕、outro開始・中間・終端の接続確認済み。BLOCKER / MAJOR 0件。
- SHA-256: `0753B72BF606FB89F6AECAF951F27C615B5E8EA8BFE8BDDED1730A4B50BA85BF`
- Git: `babd32c` を `origin/main` へpush済み。open PR 0、`main` と `origin/main` は同期済み。

## 状態集計

| 状態 | 件数 |
|---|---:|
| 完了 | 7 |
| 未定 | 0 |
| 依存待ち | 0 |
| 着手可 | 0 |
| 進行中 | 0 |

## 完了タスク

| ID | 工程 | 状態 | 完了根拠 |
|---|---|---|---|
| F0 | 検証ハーネス基盤 | 完了 | フレーム早見表・still・probe・contact sheet・18項目手順を整備・検証。 |
| F1 | 42カットQC検分 | 完了 | s1〜s7の全42カットとK1〜K3の個別証跡を記録。 |
| F1-M | QC結果統合 | 完了 | 不合格リストを統合し、根本原因ごとの修正対象を確定。 |
| F2 | 不合格修正・再検証 | 完了 | `camera.shot` のレンダラー未反映を修正し、s1c4・s7c4を再検証。 |
| F3 | 音声統合（outro） | 完了 | 正式outro配置後、BGM警告なしでmixを1回完了。 |
| F4 | 最終ビルド | 完了 | 既存 `master.mp4` を維持し、encodeを1回完了して最終MP4を生成。 |
| F5 | 独立検収・納品 | 完了 | ffprobe、EBU R128 / True Peak、全編QC、SHA-256、Git統合を完了。 |

## 検収証跡

- QC統合・最終検収: `docs/qc-report.md`
- 工程別・再開用記録: `docs/codex-session-handoff.md`
- 最終成果物: `C:\dev\github\wit-maker\neko-tera-video\out\final-master.mp4`
- ベースライン: `C:\dev\github\wit-maker\neko-tera-video\out\_baseline\final-master-before-f2.mp4`

最終確認日: 2026-07-23
