# 次期キャラクター表現基盤: CTO初期戦略

状態: **提案・未決定**  
作成日: 2026-07-23  
責任者: アトラス（Codex CTO）  
最終採否: mi3san

## 0. 結論

この課題は「口パク方式の置換」ではなく、次のように再定義する。

> **同一のキャラクター設計と顔動作意図に対して、方式固有の適切な素材を与えたとき、各表現アーキテクチャが到達できる視覚品質、制作可能性、再現性、操作性を、実映像で比較する。**

初期方針は次の通り。

1. 現行口パッチは修理対象ではなく、最低基準と構造的失敗の対照群として凍結する。
2. 公平性は「同じPNG」ではなく、同じキャラクターバイブル、動作意図、カメラ、尺、出力仕様、評価手順で担保する。
3. 方式は、離散2D、連続2D、2.5D、完全3D、ニューラル、ハイブリッドの6系統に分ける。
4. 最初の本比較は、現行対照群に加えて、連続2D、Blender 2.5D、Blender完全3Dの**スタイル付き頭部バスト**を作る。全身や本編統合はまだ行わない。
5. ニューラルとハイブリッドは候補から削除しないが、決定的リグの基準映像ができるまで本比較へ入れない。先に入れると改善箇所と失敗原因を分離できないためである。
6. Remotionは各方式の正解レンダラーではなく、manifest検証、横並び、スロー、拡大、デバッグ注釈、差分表示を担当する**比較・提示層**に置く。
7. 比較の一次判定は、方式名を隠した実映像のペア比較とする。視覚品質とコストを一つの重み付き点数へ早期に潰さない。

これは方式選定ではない。比較可能な状態を作るための技術戦略である。

## 1. 前提の仕分け

### 妥当

- 現行完成画像が持たない解剖・奥行き・隠れ領域を、局所画像差し替えだけで回復することには構造的な上限がある。
- 表現方式を先に定め、その方式が本来必要とする素材を制作する方が、汎用的な完成画像再構築を目指すより問題が小さい。
- 入力タイミング精度と描画品質は分離して評価すべきである。
- mi3sanが実映像を通常速度、スロー、拡大、デバッグ表示で見て採否を決める方針は正しい。
- PoC段階から共通化すべきなのは、比較プロトコル、入出力契約、検証、再生成であり、全方式の内部実装ではない。

### 修正する

- 「同じ顔動作」を、全方式に同じ頂点、同じShape Key、同じvisemeを要求することとは定義しない。共通化するのは**意味上の動作意図**であり、各adapterがネイティブ制御へ写像する。
- 「視覚品質」は一軸ではない。構造、時間連続性、同一性、画風、操作性、視点耐性を分離する。
- 「2.5D」と「完全3D」はBlenderというツール名で分類しない。奥行きを持つ表現でも、view-dependentな板・層・浅い形状なのか、任意視点で成立する体積モデルなのかで分ける。
- ニューラル方式の比較を、単一画像からの汎用再描画に限定しない。identity-specific学習、3D Gaussian、決定的リグへの残差などは別系統である。

### まだ判断できない

- 2Dらしい線と塗りを最優先するか、顎・口腔・頬の立体整合性を最優先するか。
- 正面寄りの固定カメラだけでよいか、将来の頭部yaw/pitchや別構図まで必要か。
- Live2D Cubismなどの専有ツールを制作工程に許容するか。OSS化する比較基盤の中核に専有runtimeを置くかは別問題である。
- 猫寺固有素材をどこまで公開できるか。
- 利用できるキャラクターデザイナー、2D rigger、3Dモデラーの技能と予算。
- ローカルGPU、VRAM、許容レンダー時間、クラウド利用可否。

## 2. 現行方式の品質上限

現行コードは、文字アラインメントから `a/i/u/e/o/closed` の6離散状態を選び、ポーズ画像の上に口のPNGパッチをアンカー配置する。`src/components/Character.tsx` では、顔本体は静止画のまま、口パッチだけが独立して差し替わる。

品質上限を作る原因はフェザー精度ではなく、表現の自由度と結合関係である。

- 顎骨と頭蓋の相対運動がない。
- 上唇、下唇、左右口角、マズル、頬が独立または連動する連続パラメータを持たない。
- 口腔、歯、舌、顎下、隠れた毛並みの前後関係がない。
- 状態間は形状補間ではなく画像差し替えで、時間連続性を保証しない。
- パッチ境界の内外で、陰影、毛流れ、輪郭、体積が別々に振る舞う。
- 発話中の頭部回転や非正面ポーズに対し、同じ局所座標の再利用を強いられる。
- 入力が母音中心なので、閉鎖、狭め、破裂、非対称、情動などの動作意図を表現できない。

したがって、現行方式の改良は「ハローを減らした比較対照群」までは有用だが、次期方式の土台にはしない。

## 3. アーキテクチャ分類

| 系統 | 代表 | 表現の本体 | 到達しやすい強み | 主な上限 | 本比較での扱い |
|---|---|---|---|---|---|
| A. 局所離散2D | 現行口パッチ | 局所画像状態 | 既存素材、低コスト | 構造非結合、継ぎ目、離散遷移 | 凍結した最低基準 |
| B. 全頭部離散2D | 頭部/顔状態スプライト | 完成画像の状態集合 | 画風を完全保持しやすい | 状態組合せ爆発、補間、制作量 | 校正用対照群。 finalistにはしない |
| C. 連続2Dリグ | ArtMesh、warp、mask、draw order | 2D頂点・層の連続変形 | 正面寄りの2D画風、低い実行コスト | 大回転、体積、複雑な口腔 | 初回の本候補 |
| D. 2.5D解剖リグ | 層、浅いgeometry、jaw、shape、depth | view依存の奥行き付き形状 | 2D画風と構造の折衷 | 有効視点範囲、層境界、rig複雑性 | 初回の本候補 |
| E. 完全3Dリグ | mesh、armature、corrective shape、shader | 体積・トポロジー | 顎・口腔・任意視点・再利用 | 初期制作量、2D画風再現 | 初回の本候補 |
| F. ニューラル再描画 | diffusion、NeRF、3D Gaussian等 | 学習された外観・形状 | 高周波ディテール、残差表現 | データ、再現性、制御、猫への転用、license | 決定的baseline後にgate |
| G. 決定的+ニューラル残差 | C/D/E + learned residual | 構造はrig、外観は残差 | 構造と高周波の両立可能性 | 学習対の作成、原因切分け | Fの後 |

全頭部スプライトを早期に外す理由は品質が低いからではない。少数状態では遷移が離散的になり、密にすると `jaw × width × corner × tongue × expression × view` の直積で素材数が増えるため、一般基盤としての伸びが悪いからである。ただし「完成絵を丸ごと描けば局所パッチよりどこまで良くなるか」を測る短い対照群としては価値がある。

## 4. 素材契約

### 全方式共通: Character Bible

- 正面、3/4、側面の外見基準
- 頭身、頭蓋、顎、マズル、頬、耳、目、ひげの比率
- 色、模様、線、塗り、毛の密度、陰影のルール
- neutral、閉口、大開口、横引き、すぼめ、口角左右、頬圧縮のshape sheet
- 歯、舌、口腔の見え方と禁止表現
- 基準カメラ、焦点距離相当、照明、背景
- キャラクター同一性を判定するランドマーク

### A. 局所口パッチ

- 完成ポーズ画像
- 口状態PNG、フェザー、アンカー、scale
- パッチ生成元と再生成スクリプト

### B. 全頭部状態

- 状態ごとの頭部完成画像
- 状態格子と命名規約
- 状態間の許可遷移、補間またはcrossfade規則
- 共通の輪郭、カメラ、照明、髪・ひげ整合

### C. 連続2D

- 分割済みレイヤー、隠れ領域、変形余白
- ArtMesh、親子deformer、mask、draw order
- 上下唇、左右口角、左右マズル、頬、下顎、顎下毛、ひげ根元
- 口腔、歯、舌の独立層
- パラメータkeyformと組合せ補正
- export/runtimeのバージョンとlicense manifest

Live2D Cubismを代表実装に使う場合、mesh/deformer/parameterによる連続変形は比較目的に合う。一方でSDK公開には利用形態に応じた契約が関係し、Coreは完全なOSSではないため、**Live2D adapterとOSS比較基盤を分離**する。

### D. Blender 2.5D

- 正面基準の層または浅いgeometry
- 頭蓋、回転中心を持つ下顎、口腔volume
- 唇・マズル・頬の変形用topology
- armature、constraints、shape keys、corrective shapes
- 層間のdepth、occlusion、camera有効範囲
- 毛・ひげ・線画の追従規則
- 決定的生成または検証用Python script

### E. Blender完全3D

- 正面・側面・3/4 model sheet
- watertightである必要はないが、変形に耐える頭部topology
- 頭蓋、下顎、口腔、歯、舌
- armature、skin weights、facial shape keys、corrective shapes、constraints
- UV、texture、shader、groom/毛、ひげ
- camera、light、color management、render engine設定
- headless再生成・レンダーscript

### F. ニューラル

- 学習データの由来、同意、license
- identity reference、必要なmulti-view/動画/scanの条件
- conditioning schemaと追跡方式
- model、weights、seed、環境lock、学習・推論設定
- temporal consistencyとfailure case
- model card、VRAM、時間、再配布可否

現在の高品質neural head avatar研究の多くは人間の頭部モデル、portrait video、multi-view、3DMM/FLAME等のpriorを前提にしている。猫寺のstylized catへそのまま一般化できるとは扱わず、独立した研究リスクとして予算化する。

### G. ハイブリッド残差

- C/D/Eの完全な決定的base
- base renderと目標画像の対応データ
- 残差を許す領域、最大振幅、confidence
- geometry/occlusionを壊さないcomposite規則
- residual無効時にbaseへ戻れるfallback

## 5. 共通Face Motion Schema

音素や母音を共通入力にせず、描画方式から独立した**動作意図**を時系列で与える。

```json
{
  "schemaVersion": "0.1",
  "fps": 60,
  "frames": [
    {
      "frame": 0,
      "jawOpen": 0.0,
      "jawForward": 0.0,
      "lipClosure": 1.0,
      "mouthWidth": 0.0,
      "mouthNarrow": 0.0,
      "cornerLeft": 0.0,
      "cornerRight": 0.0,
      "upperLipRaise": 0.0,
      "lowerLipDepress": 0.0,
      "muzzleCompressLeft": 0.0,
      "muzzleCompressRight": 0.0,
      "cheekPuff": 0.0,
      "tongueOut": 0.0,
      "headYawDeg": 0.0,
      "headPitchDeg": 0.0
    }
  ]
}
```

実装時はJSONをそのまま巨大化せず、curve + keyframe形式を正規形にする。重要なのは次の契約である。

- 値域、neutral、単位、clampをschemaで固定する。
- 左右非対称を表現できる。
- adapterは `native / approximated / unsupported / derived` をチャンネルごとに宣言する。
- `unsupported` を0として黙って無視しない。比較manifestへ残す。
- 方式固有の補正値やsecondary motionはadapter内部に置き、共通schemaへ漏らさない。
- 将来の音素変換は、このmotion schemaを生成する上流adapterとして追加する。

## 6. Artifact Contract

各方式は、同じディレクトリ構造で証拠を出す。

```text
artifacts/<run-id>/<adapter-id>/
  manifest.json
  frames/000000.png ...
  debug/
  metrics.json
  logs/
  asset-contract.md
  known-failures.md
```

`manifest.json` には最低限、adapter/version、source commit、asset hash、motion hash、camera、fps、解像度、色空間、seed、render command、開始終了時刻、GPU/CPU、peak VRAM、成功状態を持たせる。

標準出力:

- losslessなframe sequence。比較の正本は圧縮動画にしない。
- 60fps、同一frame count、同一camera crop。
- neutral背景またはalpha。alpha解釈と色空間を固定。
- normal、25% slow、200% mouth cropは比較層が生成する。
- debug passは方式に応じ、mesh/wire、bones、controls、depth、normal、mask、draw orderを出す。
- 再実行時に同一入力から同一結果を期待する方式はframe hashを比較する。
- ニューラル方式はseed固定だけで決定的とみなさず、複数runの分散を記録する。

## 7. 比較シーケンス

本編台詞を最初から使わない。原因の切り分けができる短いmotion suiteを先に使う。

| ID | 内容 | 見るもの |
|---|---|---|
| T0 | neutral hold | 同一性、基準画風、静止時ノイズ |
| T1 | jawOpen 0→1→0 | 顎関節、顎下、口腔、体積 |
| T2 | mouthWidth / mouthNarrow | 唇・マズル・頬の連続変形 |
| T3 | jawOpen中のlipClosure | 閉鎖、唇の接触、歯の隠れ |
| T4 | 左右口角の非対称 | 独立制御、同一性 |
| T5 | tongue、teeth、large-open | 前後関係、clip、口腔 |
| T6 | 2パラメータ格子と境界sweep | 組合せ破綻、補正shape不足 |
| T7 | ±15° yaw/pitch中の発話 | view依存、層境界、volume |
| T8 | 6〜10秒の共通performance | 時間連続性、coarticulation、通常速度の自然さ |

最初のsuiteは総尺20〜30秒以内に保つ。全方式を高速に再実行できることを優先する。

## 8. 評価

### 8.1 視覚品質

1. 顎関節を起点に見えるか。
2. 唇、口角、マズル、頬、顎下が一構造として動くか。
3. 歯、舌、口腔、毛、ひげのocclusionが正しいか。
4. 輪郭、毛流れ、陰影、線が時間的に連続するか。
5. texture stretch、volume loss、mesh fold、layer gapがないか。
6. neutralから極端形状までキャラクター同一性を保つか。
7. 単体パラメータだけでなく組合せで破綻しないか。
8. 通常速度で自然か、25%で破綻が露呈しないか。
9. 顔全体と200%口元の両方で成立するか。
10. 小さなhead turnで品質が崩れないか。

### 8.2 制作・運用

- 初回素材制作量
- 1つの新表情・新キャラクター・新cameraを追加する増分コスト
- artistが意図した修正を局所的に行えるか
- headless再生成、決定性、version lock
- 1 frame / suite / 1分映像の時間、peak VRAM、成果物容量
- runtimeやEditorのlicense、asset再配布、商用、OSS可否

### 8.3 判定方法

- 方式名、ツール名、制作時間を隠したA/Bペア比較を先に行う。
- mi3sanの一次判定と、ラピスの破綻指摘を分けて記録する。
- 5段階の絶対点より、「どちらが良いか / 差なし / 判定不能」と理由を残す。
- 視覚品質、制作コスト、計算資源、再現性を別表にし、重みはmi3san合意後に付ける。
- 1本のデモが良いだけでは採用しない。T0〜T8のcoverageと既知failureを確認する。

## 9. 実装順序とstage gate

### P0: 比較プロトコル

作るもの:

- Character Bible v0.1
- Face Motion Schema v0.1
- adapter CLI contract
- artifact manifestとvalidator
- T0〜T8 curves
- Remotion comparison composition
- 現行口パッチbaseline

Gate:

- 同じartifactを2回読み、frame-accurateに同じ比較動画を作れる。
- 欠損frame、fps、crop、hash不一致でvalidatorが失敗する。
- 失敗runが成功表示されない。

### P1: mechanism slice

連続2D、2.5D、完全3Dで、無彩色または単純材質の頭部を使いT1、T3、T6だけを通す。ここでは最終画風を採点せず、必要な自由度、rigの成立、口腔・occlusion、adapter難度を確認する。

Gate:

- 顎、唇、マズル、頬、口腔が個別に制御可能。
- 2パラメータ境界sweepで致命的なfold/gapがない。
- headlessまたは記録済み手順で再生成できる。

### P2: styled head bust

同じCharacter Bibleから、C/D/Eそれぞれに適した最小の**色・模様・毛・線を持つ頭部バスト**を制作し、T0〜T8を全実行する。全身、本編42カット、音声認識は作らない。

Gate:

- mi3sanが方式名を隠したnormal/slow/crop比較を完了できる。
- 各方式の既知failure、追加制作量、計算量が実測で出ている。
- 方式差よりartist差が支配的でないか、ラピスがレビューする。

### P3: finalist production slice

上位1〜2方式だけを、実台詞6〜10秒、耳・目・ひげ・呼吸を含む一つの完成カットへ拡張する。

Gate:

- 本番相当の画風と演出で品質差が再現する。
- 修正1回の所要、再レンダー、差分検査が成立する。

### P4: neural gate

決定的finalistのframeを基準に、ニューラル単体または残差が改善する具体的failureだけを対象にする。

開始条件:

- 改善対象が画素・領域・frameで特定されている。
- 学習データとlicenseが用意できる。
- baseを壊したときに自動または目視で検出できる。
- neural無効時のfallbackがある。

## 10. 初期投資の比較

数値はスケジュールではなく、P2の頭部バスト1体を作る相対レンジである。担当者の技能で大きく変わるため、P1で実測へ置き換える。

| 方式 | 素材制作 | rig/実装 | 実行資源 | 技術不確実性 |
|---|---:|---:|---:|---:|
| 現行パッチ | 1 | 1 | CPU/低VRAM | 低 |
| 全頭部状態 | 3〜8 | 1〜2 | CPU/低VRAM | 状態数で急増 |
| 連続2D | 4〜8 | 4〜8 | CPU〜一般GPU | 中 |
| 2.5D | 6〜12 | 6〜12 | 一般GPU 8〜16GB級から検証 | 中〜高 |
| 完全3D | 8〜20 | 8〜20 | 一般GPU、final品質で増加 | 中〜高 |
| ニューラル | 10〜30+ | 10〜30+ | 24GB級以上を想定し要実測 | 非常に高い |
| ハイブリッド | baseに追加 | 8〜20+ | base + 学習/推論 | 高 |

上限値は契約ではない。特に毛、2D風line、corrective shapes、学習データ制作が支配項になる。

## 11. Remotionの境界

Remotionは次を担当する。

- artifact manifestの読込み
- 同一frameの横並び
- normal / 25% slow / 200% crop
- control値、adapter名、run hash、計測値の注釈
- frame difference、contact sheet、review用動画
- mi3san向けの決定的な比較成果物

Remotionへ置かないもの:

- Blender rig、physics、shape key解決
- Live2D等のネイティブ変形の正本
- neural inferenceの内部
- 方式固有assetの自動救済

Remotionは `useCurrentFrame()` でframeを正確に選べ、image sequenceと`Sequence`で比較レイアウトを作れる。したがって提示層には適する。一方、canonical evidenceは各adapterが出したlossless frame sequenceとし、Remotion内で方式ごとに別の変形ロジックを持たない。これにより比較層のバグと方式本体のバグを分離できる。

## 12. OSS境界

### PoCから共通化する

- Face Motion Schema
- adapter CLIとmanifest
- artifact validator
- T0〜T8 motion suite
- Remotion比較composition
- frame差分、contact sheet、performance計測
- license manifest
- アンチパターン台帳と再現手順

### 採用方式が見えてから共通化する

- Blender rig generatorの汎用化
- 2D deformer template
- 毛・線画shaderの抽象化
- キャラクターasset package規格
- neural residual interface

### OSS coreへ直接入れない

- 猫寺固有で公開不可の素材
- 再配布不可のmodel weights、sample data、Editor runtime
- Live2D等の専有runtimeそのもの。必要なら外部adapterと導入手順に分離する。

BlenderはGPLであり、Blenderで作ったartwork自体にGPLが自動適用されるわけではない。一方、Live2D SDKは公開形態に応じたPublication Licenseが関係し、Cubism Coreは完全な公開ソースではない。OSSを本気で狙うなら、reference adapterはBlenderを優先し、Live2Dは互換adapterとして扱うのが安全である。

## 13. 最大の失敗リスク

1. **artist差をarchitecture差と誤認する**  
   同じ担当品質、同じCharacter Bible、同等の修正回数を記録する。

2. **共通schemaが一方式の都合へ寄る**  
   semantic intentだけを共通化し、native mappingとunsupportedを公開する。

3. **grayboxの勝敗を最終画風の勝敗にする**  
   P1は成立性、P2はstyled visualを判定する。混同しない。

4. **3Dの初期的なtoon不足を3D構造の敗北とみなす**  
   geometry、deformation、shader/styleを別々にレビューする。

5. **ニューラルの一つの良いsampleを品質上限とみなす**  
   seed/run分散、全suite、failure case、license、再現性を要求する。

6. **比較基盤を作り過ぎ、映像が出ない**  
   P0のschemaはT0〜T8と3方式に必要な最小フィールドだけにする。

7. **失敗を文章に残しただけで工程を変えない**  
   `docs/anti-patterns.md` に記録し、再発可能ならvalidator、test、DoDへ昇格する。

## 14. 現時点での候補整理

- 現行口パッチ: 維持。対照群。
- 全頭部状態: finalistからは除外。短い校正対照群として任意。
- 連続2D: 採用候補。P1/P2へ。
- Blender 2.5D: 採用候補。P1/P2へ。
- Blender完全3D: 採用候補。P1/P2へ。
- ニューラル単体: 方式自体は除外しないがP4まで延期。
- 決定的+ニューラル残差: 最終的な有力候補だが、baseなしには評価不能なのでP4まで延期。

## 15. mi3sanに確認する決定事項

P0開始前に、少なくとも次を確認する。

1. 正面中心でよいか。将来必要な最大yaw/pitchは何度か。
2. 「元の2D画風の完全保持」と「口・頬・顎の立体整合性」のどちらを優先するか。
3. 3Dらしい陰影を許容するか。2D線画・塗りの再現を必須にするか。
4. リアルタイム利用も対象か、事前レンダー動画だけか。
5. 専有Editor/runtimeを許容するか。OSS coreは完全OSSが必須か。
6. 猫寺固有assetの公開可能範囲。
7. 利用可能な2D/3D制作者、予算、期間。
8. GPU機種・VRAM、クラウド可否、許容render時間。
9. mi3sanが比較時に最も重視する上位3軸。

## 16. 初回のCTO判断

現時点で採用方式を一つに決めるべきではない。最も情報価値が高い投資は、次の順である。

1. P0の比較契約と検証基盤
2. C/D/Eのmechanism slice
3. 同一Character Bibleによる3方式のstyled head bust
4. 方式名を隠したmi3sanの実映像比較
5. 上位1〜2方式だけのproduction slice
6. 明確な残差が残った場合だけneural/hybrid

私の事前仮説は、**正面中心・2D画風最優先なら連続2Dまたは2.5D、視点自由度・口腔・再利用性まで含めるなら完全3Dが優位**である。ただし、これは採用判断ではない。特に猫のマズル、毛、ひげ、2D線画は実物を作らないと逆転し得るため、P2の映像を証拠に更新する。

## 17. 技術参照

- Remotion: `useCurrentFrame()`、image sequence、`Sequence`を比較提示に利用  
  https://www.remotion.dev/docs/use-current-frame  
  https://www.remotion.dev/docs/sequence
- Live2D Cubism: ArtMesh/deformer/parameterと補間特性  
  https://docs.live2d.com/en/cubism-editor-manual/deformer/  
  https://docs.live2d.com/en/cubism-editor-manual/edit-parameters/
- Live2D SDK Publication License  
  https://www.live2d.com/en/sdk/license/
- Blender riggingの構成要素とGPL/artworkの境界  
  https://docs.blender.org/manual/en/latest/animation/introduction.html  
  https://docs.blender.org/manual/en/latest/getting_started/about/license.html
- Neural avatarの代表例（人間頭部・特定データ前提を確認するための一次資料）  
  https://github.com/YuelangX/Gaussian-Head-Avatar  
  https://github.com/ShenhanQian/GaussianAvatars

