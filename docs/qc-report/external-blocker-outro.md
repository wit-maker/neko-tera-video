# 外部blocker報告: outro.mp3

## それ以外のタスク

- F0: 検証ハーネス、フレーム早見表、still/probe/contact sheetの疎通を完了。
- F1: 42カットのQCとK1〜K3の特別判定を完了。BLOCKER/MAJORは0件。
- F1-M/F2: 3連続mediumのMINOR 2件を根本原因（shot値がレンダラーで未使用）から修正し、再検証済み。
- F4: 修正後の全編renderを完了。`out/master.mp4` は1080×1920、60fps、H.264/AAC、303.978667秒、495,248,218 bytes、SHA-256 `20C12D9EF1D8AA487599C6C9BDA8D34BE8873EB2C243D285C2F083686041373C`。
- Git: F1〜F2はPR #4〜#15でmainへ統合済み。

## 唯一のblocker

- 必要ファイル: `outro.mp3`
- 配置先: `public/bgm/outro.mp3`
- 必要形式: MP3、stereo、48kHz
- 必要な理由: s7c4〜s7c6が`bgmCue: "outro"`を指定しており、正式音源なしに最終BGM・フェード・ラウドネスを確定できない。
- 探索結果: リポジトリおよび `C:\dev\github\wit-maker` 配下に該当素材は存在しない。代替BGM・ダミー音源は使用しない。

## 配置後に実行する残作業

1. `ffprobe`でoutroのMP3/stereo/48kHzを確認する。
2. `npm run mix`を実行し、`[warn] BGM 未配置`が出ないことを確認する。
3. `npm run encode`で新masterと新音声をmuxし、final-masterを生成する。
4. final-masterに対してffprobe、ebur128（I=-14±0.5 LUFS、AAC TP≤-1.0 dBTP）、全編再生QC、SHA-256を実行する。
5. 本レポートと検収報告を最終値へ更新し、最終承認を依頼する。

## 注意

- 現在の `out/final-master.mp4` はF2前のbaselineであり、納品候補として更新していない。
- baselineは `out/_baseline/final-master-before-f2.mp4` に保全済み。

## 解消結果（2026-07-23）

- 発注者提供のoutro原本は44.1 kHz stereo MP3だったため、同一音源のみを48 kHz stereo MP3へ変換した。原本はGit管理外の安全な場所へバックアップ済みで、別曲・ダミー・既存main BGMは使用していない。
- 反映後の `public/bgm/outro.mp3` はffprobeで `codec_name=mp3`、`sample_rate=48000`、`channels=2` を確認した。
- `npm run mix` と `npm run encode` は成功し、BGM未配置警告は0件。新しい納品候補は `out/final-master.mp4`（495,418,678 bytes）である。
- 独立測定: H.264 1080x1920/60fps + AAC 48 kHz stereo、映像303.900秒/音声303.916秒（差0.016秒）、統合ラウドネス -14.0 LUFS、AAC True Peak -1.4 dBTP。全基準に適合した。
- 全編デコードおよびoutro開始・中間・終端の映像/字幕/音声接続QCは合格。最終SHA-256は `0753B72BF606FB89F6AECAF951F27C615B5E8EA8BFE8BDDED1730A4B50BA85BF`。本blockerは解消済み。
