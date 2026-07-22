# F1-M: QC結果統合と不合格一覧

## 集計

- シーンQC: 42カットを確認済み。
- 特別判定: K1（ミケ口パッチのハロー）、K2（s1c1右柱の埋め跡）、K3（先生teaポーズの口被覆）はすべてpass。
- 全編共通検査: AACの統合ラウドネスは -14.0 LUFS、トゥルーピークは -1.4 dBTP、60fps・303.916秒でpass。
- 不合格: 同一shot値が3カット連続する構成が2箇所。修正前に `camera.shot` がレンダラーで未使用であることを確認した。

## 不合格一覧

| ID | シーン | カット | フレーム範囲 | 問題 | 期待状態 | 重大度 | 修正対象 | 再検証方法 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F2c-01 | s1 | s1c2〜s1c4 | 240〜1572 | `camera.shot=medium` が3連続。かつshot値が映像スケールへ反映されない | 連続3カットなし、closeupが実際に寄りの構図として描画される | MINOR | `src/components/CutView.tsx` のshot→基本倍率適用、s1c4をcloseupへ変更 | s1c2〜s1c4のhead/mid/tail stillとshot列の再計測 |
| F2c-02 | s7 | s7c2〜s7c4 | 16144〜17230 | `camera.shot=medium` が3連続。かつshot値が映像スケールへ反映されない | 連続3カットなし、closeupが実際に寄りの構図として描画される | MINOR | `src/components/CutView.tsx` のshot→基本倍率適用、s7c4をcloseupへ変更 | s7c2〜s7c4のhead/mid/tail stillとshot列の再計測 |

## 修正不要項目

- K1〜K3、字幕セーフエリア、黒板可読性、目視上のレイヤー欠け、音量・ピーク、総尺はpassとして維持する。
- BLOCKERおよびMAJORは0件。
