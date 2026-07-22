# F2c: 連続shot構成の修正

## 修正内容

- `CutView`へshotごとの基本倍率を追加し、`closeup`を背景・黒板・キャラへ1.10倍で適用した。字幕は変換の外側に残る。
- s1c4とs7c4のshotを`medium`から`closeup`へ変更し、s1/s7とも3連続mediumを解消した。

## 再検証条件

- `s1`: wide, medium, medium, closeup, closeup, board。
- `s7`: wide, medium, medium, closeup, closeup, medium。
- `npm run validate`、`npm run test`、`npm run typecheck`を通す。
- s1c4/s7c4のmid stillで、字幕セーフエリアを侵食せず実際に寄りの構図になっていることを確認する。

## 再検証結果

- 検証still: `out/qc-f2/s1c4-mid-closeup.png`、`out/qc-f2/s7c4-mid-closeup.png`、比較sheet: `out/qc-f2/shot-sequence.png`。
- 2カットともcloseup倍率が背景・キャラへ適用され、字幕は変換外で下部セーフエリアに維持された。F2c-01/F2c-02をclosedとする。
