# Codexセッション引き継ぎ

最終更新: 2026-07-23（この文書のcommit直前に実測）

## 1. 最終Goal

Claude Artifact <https://claude.ai/code/artifact/86dd0b8d-0cf7-4d2c-baeb-0a4a7b5755a3?open_in_browser=1&via=user_open&org=c9bb42f0-15ef-45db-bcf6-c1f56c10828a> に記載された全タスクを、実装・QC・統合・納品まで完了する。

## 2. 現在のGit実状態

- 文書作成直前のbranch / HEAD: `main` / `50421f4f2d94932f534c39ea8ec02b72b6f6933a`。
- `origin/main`との差分: `git rev-list --left-right --count HEAD...origin/main` は `0 0`。同期済み。
- `git status --short --branch`: `## main...origin/main` と `?? .serena/` のみ。tracked working treeはclean。
- `.serena/` は開始時からあるユーザー所有の未追跡ディレクトリであり、変更・削除・commit禁止。
- open PR: 0件（`gh pr list --state open`で確認）。
- 本作業でmerge済みPR: #4〜#16。F1シーン/K判定=#4〜#13、F1-M=#14、F2=#15、F4証跡・blocker文書=#16。
- worktree: リポジトリroot `C:\dev\github\wit-maker\neko-tera-video` のみ。F1/F2用の一時worktreeは削除済み。
- local branch: `main`のみ。今回作成したリモートbranchも削除済み。`origin/task/bootstrap-docs`、`origin/task/remove-dev-overlay`、`origin/task/timing-tests`は既存のmerge済み履歴参照であり、本作業の残件ではない。

## 3. 完了済み工程と証拠

| 工程 | 状態 | 主な証拠 | Git証拠 |
| --- | --- | --- | --- |
| F0 | 完了 | `docs/qc-report.md` の42カットフレーム表、`out/qc-test.png`、`out/qc-test-sheet.png`、`out/qc-s1c2-*.png` | `398819e`、`7ab26d7` |
| F1 | 完了 | `docs/qc-report/s1.md`〜`s7.md`、head/mid/tail stillとscene contact sheet（`out/qc-final/`） | PR #4〜#10 |
| K1〜K3 | 完了・pass | `docs/qc-report/k1.md`〜`k3.md`、`out/qc-final/special/` | PR #11〜#13 |
| F1-M | 完了 | `docs/qc-report/f1-merge.md`。MINOR 2件を確定、BLOCKER/MAJOR 0件 | PR #14 / `9a73191` |
| F2 | 完了 | `docs/qc-report/f2-shot-sequence.md`、`out/qc-final/f4-shot-sequence.png`、`out/qc-final/f4-closeup-regression.png` | PR #15 / `bd56baf` |
| F4 | 完了 | 新しい `out/master.mp4`、ffprobe、SHA-256、F4証跡 | PR #16 / `50421f4` |

検証済みコマンド: `npm run validate`（7 scenes / 42 cuts / 45 dialogue lines）、`npm run test`（20 passed）、`npm run typecheck`。

## 4. 実装された修正

- 根本原因: `video.json` の `camera.shot` はメタデータとして存在したが、`src/components/CutView.tsx` が画角変換へ使用していなかった。そのためs1c2〜s1c4、およびs7c2〜s7c4の`medium` 3連続が実映像の構図差としても反映されなかった。
- 修正コード: `src/components/CutView.tsx` に `SHOT_SCALE` を導入。`closeup: 1.1`、`insert: 1.06`を背景・黒板・キャラを含むカメラ変換に適用し、字幕は変換外に維持してセーフエリアを保護した。
- `video.json`: `s1c4.camera.shot` と `s7c4.camera.shot` を `medium` から `closeup` へ変更。
- 再検証: 新masterからs1c4/s7c4と全closeupカットを再抽出し、寄りの画角・字幕セーフエリア・描画欠けなしを確認。上記のvalidate/test/typecheckも成功。

## 5. 現在の成果物

- 映像原本: `C:\dev\github\wit-maker\neko-tera-video\out\master.mp4`
- サイズ: `495,248,218 bytes`
- 尺: format `303.978667s`、映像 `303.933333s`、映像/音声差 `0.045334s`
- 解像度 / FPS: `1080×1920` / `60/1`
- codec: 映像 H.264、音声 AAC 48kHz stereo
- SHA-256: `20C12D9EF1D8AA487599C6C9BDA8D34BE8873EB2C243D285C2F083686041373C`
- baseline動画: `C:\dev\github\wit-maker\neko-tera-video\out\_baseline\final-master-before-f2.mp4`（F2前の保全用。削除禁止）
- 注意: `out/final-master.mp4` はF2前の旧finalであり、新しい納品候補ではない。

## 6. 未完了タスク

1. `public/bgm/outro.mp3` の配置確認。
2. `npm run mix`。
3. `npm run encode`。
4. 新しい `final-master.mp4` のffprobe。
5. EBU R128統合ラウドネスおよびAAC True Peak測定。
6. 最終音声を含む全編の目視・聴感QC。
7. 最終SHA-256、`docs/qc-report.md`、`docs/qc-report/external-blocker-outro.md`、このhandoff文書の最終値更新。
8. 最終Git同期・open PR 0・tracked working tree cleanの確認。

## 7. 外部blocker

- 必要ファイル名: `outro.mp3`
- 絶対配置先: `C:\dev\github\wit-maker\neko-tera-video\public\bgm\outro.mp3`
- 必要形式: MP3、stereo、48kHz
- 代替不可の理由: s7c4〜s7c6は `bgmCue: "outro"` を指定している。正式音源なしにBGM接続、フェード、ラウドネス、最終納品音声を確定できない。ダミー音源や既存BGMへの置換は仕様違反。

## 8. outro.mp3配置後の正確なPowerShell手順

```powershell
Set-Location C:\dev\github\wit-maker\neko-tera-video

# 1. 配置・形式を確認する。存在しない、MP3でない、48kHz stereoでない場合は停止する。
$outro = '.\public\bgm\outro.mp3'
if (-not (Test-Path -LiteralPath $outro)) { throw "outro.mp3 がありません: $outro" }
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of default=noprint_wrappers=1 $outro
# 成功判定: codec_name=mp3 / sample_rate=48000 / channels=2

# 2. 正式音源を含むミックスを生成する。
npm run mix 2>&1 | Tee-Object -FilePath .\out\mix-final.log
if ($LASTEXITCODE -ne 0) { throw 'mix失敗' }
if (Select-String -LiteralPath .\out\mix-final.log -Pattern '\[warn\] BGM 未配置' -Quiet) { throw 'outro未配置警告が残っています' }
Get-Item .\out\master-audio.wav
# 成功判定: warningなし、out/master-audio.wavが更新される。

# 3. 新master映像と新音声をmuxする。
npm run encode 2>&1 | Tee-Object -FilePath .\out\encode-final.log
if ($LASTEXITCODE -ne 0) { throw 'encode失敗' }
Get-Item .\out\final-master.mp4
# 成功判定: final-master.mp4が更新され、encodeログに final: ... I=... LUFS, TP=... dBTP がある。

# 4. パイプラインログから独立に最終ファイルを計測する。
ffprobe -v error -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels,duration -show_entries format=duration,size -of json .\out\final-master.mp4
ffmpeg -nostats -i .\out\final-master.mp4 -af ebur128=peak=true -f null - 2>&1 | Tee-Object -FilePath .\out\final-ebur128.log
Get-FileHash .\out\final-master.mp4 -Algorithm SHA256
# 成功判定: 1080x1920 / 60fps / H.264+AAC、映像音声尺差<=0.1秒、I=-14±0.5 LUFS、AAC TP<=-1.0 dBTP。

# 5. 全編を目視・聴感で確認後、Git最終確認を行う。
git fetch origin
git rev-list --left-right --count HEAD...origin/main
gh pr list --state open --limit 100
git status --short --branch
```

生成される主要ファイルは `out/master-audio.wav`、`out/final-master.mp4`、`out/mix-final.log`、`out/encode-final.log`、`out/final-ebur128.log`。

## 9. 最終受入条件

- 1080×1920、60fps、H.264/AAC。
- 映像と音声の尺差が0.1秒以内。
- 統合ラウドネスが-14±0.5 LUFS。
- 納品AACのTrue Peakが-1.0 dBTP以下。
- outroを含む全編の目視・聴感QCを完了。
- `main`と`origin/main`が同期。
- open PRが0。
- tracked working treeがclean（`.serena/` の既存未追跡状態は除外して保持）。

## 10. 禁止事項

- ダミーoutroを使わない。
- `main-soft.mp3` または `main-warm.mp3` をoutroとして流用しない。
- `.serena/`を変更・削除・commitしない。
- 完了済みF1/F2を理由なく再実行しない。
- 既存 `master.mp4`、`final-master.mp4`、baselineを削除しない。

## 11. 最終完了記録（2026-07-23）

- 正式outro原本（44.1 kHz stereo MP3、SHA-256 `0F4E8F3E5C5FD64B4696ED5A7E66F2F003CE6FD1FC9966589EAF99DFE56588B3`）をGit管理外の安全なバックアップ先へ保全し、同一音源を48 kHz stereo MP3に変換して `public/bgm/outro.mp3` へ反映した。ffprobe確認値は `mp3` / `48000 Hz` / `2 channels`。
- F4の `out/master.mp4` を再レンダーせず、`npm run mix` と `npm run encode` を各1回実行した。mixログにBGM未配置警告はなく、F0/F1/F1-M/F2/F4は再実行していない。
- 最終 `out/final-master.mp4`: 495,418,678 bytes、H.264 1080x1920/60fps、AAC 48 kHz stereo、映像303.900秒、音声303.916秒、尺差0.016秒。
- 独立EBU R128測定: Integrated loudness `-14.0 LUFS`、AAC True Peak `-1.4 dBTP`。全編デコードとoutro区間s7c4/s7c5/s7c6/終端の映像・字幕・音声接続QCは合格し、BLOCKER/MAJORは0件。
- 最終SHA-256: `0753B72BF606FB89F6AECAF951F27C615B5E8EA8BFE8BDDED1730A4B50BA85BF`。
