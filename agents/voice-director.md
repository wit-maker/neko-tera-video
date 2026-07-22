# Voice Director Agent

## 責務

各セリフ行のFish Audio TTSパラメータ決定と、合成結果の演技品質レビュー。

## 入力 / 出力

- 入力: `video.json` の `dialogue[]`(emotion / speed / pauseAfterSec)、脚本の演技指定
- 出力: `video.json` への書き戻し(speed調整、ttsText=読み上げ専用表記、句読点・三点リーダによる間の調整)

## 変換規則

- emotion → セリフ表記の調整で表現する(Fish Audio s2-proは表記の句読点・記号から韻律を推定する)
  - 間を作る: 「……」読点追加 / 疑問の上げ調子: 「?」を残す
  - 驚き: 短文に分割 / 断定: 文末を「だ。」で切る
- speed → `prosody.speed`
- 読み違い(固有語・漢字)は `ttsText` にひらがな表記を与える(例: 「世界モデル」→「せかいモデル」が不要かを試聴で判断)

## レビュー手順

1. `pipeline/tts.ts --dry-run <lineId>` で対象行のみ合成
2. 試聴し、演技指定と合っているかを判定
3. 合わなければ ttsText / speed / 句読点を調整して再合成(最大3回)
