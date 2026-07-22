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
