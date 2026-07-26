# p1-d0 · mi3san 判断 packet（P1 render 波を解放するために必要な8件）

**カード:** `M3-14` を含むが、それだけではない
**担当:** Orbit が提示、mi3san が決定
**性質:** 実装 packet ではない。**W2（render 4カード）を block している**

散在させると判断が漏れるため1件にまとめた。1〜3 は render を開始できるかどうかを直接決める。
4〜5 は決めずに進むと**4本のrenderを作り直すことになる**。6〜8 は先送りできるが、先送りの代償を明記する。

**W1（共有インフラ 6 packet）はこの判断を待たずに着手できる。** インフラは render を実行しない。

---

## 1. `M3-14` の対象実行ファイルを全部そろえる 🔴 render を block

**現状。** PR #33 が記録した証跡 `out/m3/network-enforcement.json` が名指ししている実行ファイルは1つだけである。

```
node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe
enforced: false
```

**これは私の設計ミスである。** D と E は Blender headless でレンダーするため `blender.exe` を使う。Chrome に rule を当てても D/E は解放されない。この構成のままだと、Chrome の rule を適用したあとに Blender が必要だと判明し、**2度お願いすることになる**。1度で済ませたい。

**決めていただきたいこと.** 次の実行ファイル群に対して、outbound を遮断し loopback のみ許可する rule を適用するか。

| 方式 | 実行ファイル | 備考 |
| --- | --- | --- |
| A | `chrome-headless-shell.exe`（上記パス） | Remotion が起動する |
| D / E | `blender.exe`。`M3-01` provision の実体（`NEKO_BLENDER_EXECUTABLE` が指すパス） | Blender 5.2 ではなく **4.5.0 の方**。5.2 は目視検査専用でレンダーには使わない |
| C | **不要** | 決定 4 で自前ラスタライザを選んだ場合、C は Chrome も Blender も使わない。ネットワーク接触面がゼロになる |

必要な rule の性質: Direction=Outbound / Action=Block / Program=各絶対パス / RemoteAddress=Any / Enabled=True。
作成方法（GUI、管理者PowerShell、その他）はお任せする。**agent は firewall rule を変更しない。**

適用後、`npm run m3:record-network-enforcement -- <exe>` を各実行ファイルに対して実行すると証跡が記録される。

**先送りした場合:** render 4カードすべてが開始できない。P1 が止まる。

---

## 2. P1 sequence 定義の承認 🔴 render を block

**現状。** `T0/T1/T3/T6/T7/T9` は `docs/character-architecture-strategy.md` の**散文の意図表**としてしか存在しない（「neutral hold」「opening ramp」「open中のclosure」など）。制御トラックも、フレームごとの値も、尺も、どこにも無い。

**なぜ判断が要るか。** 4つのセッションが各自でタイミングを発明すると、比較は方式差ではなく**作画差**を測る。戦略文書が「artist差をarchitecture差と誤認する」として警告しているものそのものである。しかも `finalRenderAttemptsMax`（`p1-track-a-run-definition.json` 参照）は小さく、**候補あたり実質1発**であり、sequence が悪いと判明する頃には試行を使い切っている。

sequence を書く人間が、**mi3san が何を見るかを決めている**。だから agent が単独で確定すべきではない。

**進め方の提案。** `p1-i1` が方式非依存の制御トラックを起案し、mi3san が承認してから render に入る。i1 の受入条件には次を機械的に入れる。

- yaw / pitch が**全フレームで** ±15° / ±10° 内（端点だけの検査は AP-013 を再発させる。Cの欠陥2件はどちらも範囲の**内側**にあった）
- T3 は開口区間の**内側**に閉鎖を含む
- T9 は hold と方向反転の**両方**を含む
- T6 は二軸を**同時に**動かす（順番に動かすと組合せ破綻が出ない）

**先送りした場合:** render を始められるが、比較が無効になるリスクを負う。推奨しない。

---

## 3. 全 artifact を 619 フレームに収めるか 🔴 契約とrender両方を決める

**現状。** `pipeline/p0b/comparison-contract.ts` の `validateTimebase` が `{fps:60, startFrame:0, endFrameExclusive:619}` を**ハードコードで固定**している。`M1-05` は P1 artifact をこの schema へ登録する。

6つの sequence を 619 フレーム（約10.3秒）に収めると、**1 sequence あたり約1.7秒**になる。T9（速度変化・hold・方向反転）を1.7秒で表現できるかは疑わしい。

**選択肢。**

| 案 | 内容 | 代償 |
| --- | --- | --- |
| **A. 619フレーム1本** | 6 sequence を1本の artifact に連結 | 各 sequence が短い。契約は無変更 |
| **B. sequence別 artifact** | 6本の artifact、各々に十分な尺 | `validateP0bContract` の timebase 固定を緩める必要がある。P0a の証跡との整合を再確認する |

これは contract module（`p1-i3`）と render 4本すべての形を決める。**着手前に必要。**

---

## 4. C のラスタライズ経路と cage の補間方式 🟡 決めずに進むとCを作り直す

**現状。** C（`pipeline/m3/c/`）は純TypeScriptで、`evaluate(controls)` が変形済みの制御ケージと層ごとの塗り色を返す。これをどうやってピクセルにするかが未決である。

**4-1. 経路。**

| 案 | 内容 | 帰結 |
| --- | --- | --- |
| **自前ラスタライザ（推奨）** | 走査線多角形塗り。依存ゼロ、決定的、解析figureに対してピクセル厳密にテストできる | C の render 経路から Chrome が消える。**決定1でCの enforcement 証跡が不要になる** |
| Remotion / Chrome SVG | 既存の Remotion 経路に乗せる | `src/Root.tsx` の編集が A に加えて C でも必要になり fixed-input gate に載る。C が Chrome の network 範囲に入る。戦略文書 §15 / GOV-010 の「adapterがレンダーし、Remotionは検証済みartifactを提示するだけ」を反転させる |

**4-2. cage の補間。** `asset.ts` は cage を「**最終的な輪郭ではなくメッシュ入力**であり、レンダラが補間する」と書いている。

- **多角形塗り** — C は**カクカクに描画される**。レビュアーはラスタライザの選択を「Cの品質上限」と読む
- **スプライン補間** — 補間方式が C の宣言された機構の一部になる

どちらでも構わないが、**render packet の中で黙って決めてはいけない。** mi3san は画面で判断するので、これは画面上の見え方を決める選択である。

---

## 5. D / E のカメラ非対称 🟡 決めずに進むと crop 比較が無意味になる

**現状。**

| 方式 | 座標系 / カメラ |
| --- | --- |
| A | 出力 1080×1920 |
| C | asset 空間 1280×1920 |
| **D** | `.blend` に**カメラが無い** |
| **E** | 自前の ortho カメラを `view-pivot` に親子付け。カード要求が「camera/view behavior を asset 側で表現」だったため |

4方式が頭部を画面の別々の位置に置くと、**共通の crop 矩形が意味を失う**。crop presentation は「同じ場所を同じ倍率で見る」から比較になる。

**選択肢。**

| 案 | 内容 |
| --- | --- |
| **共通 framing 契約（推奨）** | 参照ランドマーク（目・鼻・口角など）の出力ラスタ座標を契約で固定し、conformance で許容差内に入っているか検査する。E の authored camera も同じランドマークに落ちるよう構成する |
| crop 比較を諦める | normal / slow / still だけで比較する。crop は方式ごとに別枠 |

E だけが自前カメラを持つ非対称は、`M3-08` のカード要求そのものなので**それ自体は正しい**。問題は、共通 crop と両立させるかどうかである。

---

## 6. K-02 · agent が制作した作業の人時計上 🟢 M3-12 の前に必要

**現状。** `M3-03` は上限を**人間 operator の人時**で固定した。C/D/E/B1/B2 の5つの effort log はすべて `operatorHours: null` である。数値を捏造すると Track A のコスト軸が壊れるため、空にしてある。

**帰結。** budget の3次元のうち、**revision 数と render 試行数は機械的に強制できるが、人時は強制できない**。render packet はこれを明記して進めるが、`M3-12` のコスト軸と `M3-13` の候補判断には計上方法が要る。

**決めていただきたいこと.** agent 実行分をどう扱うか。例: 計上しない / 壁時計時間で代替する / 別軸として分ける / 人間換算の係数を置く。**方式ごとに違う基準を使わないことだけが条件**である。

---

## 7. K-03 · 欠陥修正を revision に計上するか 🟡 C の render 前に決めたい

**現状。** 方式C の `nativeAssetVersions` が **3 / 承認上限 2** である。version 2 が、**自分の承認済み制御範囲の内側で自己交差する輪郭**を生成していた（AP-013）。既知の不正形状を比較用 asset に残すほうが P1 証跡を汚すと判断して修正し、PR #30 に開示した。外見・品質・スタイルの変更はしていない。

**なぜ C の render 前に決めたいか。** `C-KF-004`（yaw時の層の接続が未検証）は、**`M3-05` の実フレームで欠陥が見つかると予告している**。そのとき C に修正余地が残っていないと、欠陥を抱えたまま比較に出すか、超過を再度お願いすることになる。

**選択肢.** 欠陥修正を計上する（→ C へ明示的な追加承認が必要）/ 計上しない（→ C は 2/2 で品質反復の余地なし、ただし欠陥修正は別枠）。

---

## 8. mechanism-native debug を横並び比較するか 🟢 M1-06 の前でよい

**現状。** presentation set の `debug` には **P0 に生成器が1つも無い**。前例ゼロから作る。

**提案する二層構成。**

- **層1 · 方式非依存オーバーレイ** — sequence ID、フレーム番号、駆動している intent 制御値、observable 参照位置、framing ランドマーク、crop 矩形。**全方式でピクセル同一のスタイル**。横並び比較はこの層だけ
- **層2 · 機構固有パス** — 方式ごとに内容が違う。A は口パッチの矩形境界と選択された patch id、C は変形後 aperture とクリップ結果と層ごとの視差ベクトル、D は plate の深度順と対ごとの深度差と画面重なり、E は内部volumeの内包判定と pivot の yaw/pitch と volume 間の貫入

層2 は `occlusion-evidence.ts` が「機構は正規化せず記録する」と要求している通り、**内容が違うことに意味がある**。

**決めていただきたいこと.** 層2 を横並びで比較に出すか、方式ごとの証拠として個別に置くだけにするか。比較不能なオーバーレイを並べると「**見やすさ**」を品質と誤読する危険がある。

---

## まとめ

| # | 件名 | 緊急度 | block するもの |
| --- | --- | --- | --- |
| 1 | M3-14 の実行ファイル全部 | 🔴 | render 4カード全部 |
| 2 | sequence 定義の承認 | 🔴 | render 4カード全部（比較の妥当性） |
| 3 | 619フレームか sequence別か | 🔴 | contract module と render の形 |
| 4 | C のラスタライズ経路と補間 | 🟡 | C の見え方。決めずに進むと作り直し |
| 5 | D/E カメラ非対称と共通 framing | 🟡 | crop 比較の成立 |
| 6 | K-02 人時計上 | 🟢 | M3-12 のコスト軸 |
| 7 | K-03 欠陥修正の計上 | 🟡 | C の修正余地 |
| 8 | debug 層2 の扱い | 🟢 | M1-06 の presentation |

**1〜3 が揃えば W2 を開始できる。** 4〜5 は W2 の直前まで、6〜8 は W3 までに決まればよい。
