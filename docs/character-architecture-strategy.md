# 次期キャラクター表現基盤: CTO改訂戦略

状態: **goal段階レビュー収束・P0計画へ移管可能**

版: v0.3

改訂日: 2026-07-23

責任者: アトラス（Codex CTO）
最終採否: mi3san

判断状態の定義と現在の台帳は `docs/architecture-governance.md`、環境拡張案は `docs/tooling-extension-strategy.md` を正本とする。

## 0. 改訂結論

この課題は「口パッチを何へ交換するか」ではない。

> **同一のキャラクター設計とperformance intentに対して、方式ごとのネイティブ素材と専門技能を与えたとき、各表現アーキテクチャが到達する映像、必要投資、再現性、操作性、失敗条件を、正規化されたartifactで比較する。**

ラピスの指摘を受け、初稿を次のように修正する。

1. 候補をbase representationとenhancement layerの二軸へ分ける。cleanup、neural redraw、neural residualをbase方式と排他的な候補にしない。
2. 共通Face Motion Schemaを、`Performance Intent`、`Observable Reference`、`Adapter Native Controls`の三層へ分ける。
3. 公平性を、同じ予算での到達点と、各方式の改善飽和点の二本立てで評価する。
4. P1でview依存と時間連続性を必ず露出する。
5. ニューラル本比較は後段のまま維持するが、候補を事実上排除しないため早期N0 feasibility spikeを置く。
6. validatorをRemotionから分離する。Remotionを提示層へ限定する案は維持するが、まだ `PROPOSED` であり不変条件ではない。
7. artifact contractへtimebase、色、alpha、camera、crop、AA、背景合成の正規化を追加する。
8. 根拠のない相対点数を廃止し、質的な投資階級と未確定性を示す。
9. 提案、レビュー上のguardrail、mi3san承認、実験結果、ADRを状態管理する。
10. Blender、Live2D、ニューラル、2D制作環境は、閉じた検証ループに必要になった段階で導入する。
11. conformanceとevaluationを別artifact・別判定にし、契約適合を視覚品質合格と呼ばない。
12. blockerをP0計画前、P1実行前、P2計画前へ分ける。

これは方式選定でもP0実装計画でもない。goal段階の比較戦略であり、ラピス再レビュー条件を反映したため、次はオービットがP0計画を作る。

## 1. ラピスレビューへの回答

| 指摘 | アトラス判断 | 改訂 |
|---|---|---|
| AP-004が未観測リスク | 同意 | 実際に観測した局所パッチの失敗へ再接地。別途AP-007を登録 |
| 手描き2Dが分類から消えた | 同意 | B1とB2を分離し、B2を品質上限対照へ追加 |
| motion schemaがrig寄り | 同意 | Intent / Observable / Native Controlへ三層化 |
| artist差対策が不足 | 同意 | 固定予算と到達品質の二トラック化 |
| P1のview/temporal不足 | 同意 | T7とT9をP1必須へ追加 |
| neuralがP4まで無検証 | 同意 | 比較外のN0 feasibilityを早期追加 |
| validatorとRemotionが未分離 | 同意 | benchmark CLIを正本validatorとする案へ修正 |
| artifact正規化不足 | 同意 | timebase、色、alpha、camera等を契約へ追加 |
| 投資表が擬似精度 | 同意 | 数値を撤回し質的階級へ変更 |
| 未承認提案がAGENTS規約 | 同意 | `docs/architecture-governance.md`を追加し規約を分離 |
| Blender license表現が粗い | 同意 | artwork、`bpy` script/add-on、Blender本体を分離 |
| hard blockerが多すぎる | 同意 | P0前、P1実行前、P2計画前へ再分類 |

異論は、手描き2Dやニューラルを必ず同じ深さまで制作すべき、という意味にはしない点だけである。早期実験の目的は全候補へ同額投資することではなく、次の投資判断を変え得る情報を最小コストで得ることである。

### 1.1 ラピス再レビューへの回答

レビュー証跡: https://github.com/wit-maker/neko-tera-video/pull/17#issuecomment-5054939040

| 条件付きComment | v0.3での反映 |
|---|---|
| 候補分類を二軸化 | Base A/B1/B2/C/D/Eと、Enhancement none/manual cleanup/neural redraw/neural residualへ分離 |
| Observable Referenceの測定契約を追加 | support状態、method/version、coordinate space、tolerance、confidence/manual、frame/intervalを必須metadata化 |
| Track Bの飽和判定を証拠化 | cycleごとにfailure、人時、before/after、結果、継続・停止理由を保存 |
| conformanceとevaluationを分離 | `conformance.json`と`evaluation.json`を別生成し、passの意味を限定 |
| blockerの判断時期を再分類 | GOV-014/016はP0前、GOV-013はP1実行前、GOV-015はP2計画前。4件ともmi3san決定済み |

初回12項目は解消、環境拡張案はラピス承認済みである。上記5点を反映したため、ラピス側のgoal段階レビュー条件は満たした。

## 2. 判断状態

### `OWNER_DIRECTIVE`

- 方式名や理論だけで採否を決めず、mi3sanが実映像を比較する。
- 方式ごとにネイティブ素材を制作する。
- 同じ完成PNGを全方式へ強制しない。
- 音素認識・時間同期と描画品質を分離する。
- 再利用可能な失敗を永続的に継承する。

### `REVIEW_GUARDRAIL`

- 観測事実、将来リスク、設計仮説を分離する。
- 視覚品質は最終表示、slow、crop、debugを含む成果物で見る。
- 視覚品質、制作量、計算資源、再現性、操作性、licenseを未合意の重みで統合しない。

### `PROPOSED`

- 本書の候補二軸
- 三層motion contract
- P0〜P4とN0
- benchmark validatorとRemotionの境界
- 二つの比較トラック
- artifact contract v0.1
- 環境拡張順序

### `ACCEPTED_DECISION`

- P1の暫定視点範囲はyaw ±15°、pitch ±10°。
- 最初の候補選定は事前レンダーだけで行い、リアルタイム性能は後段で別評価する。
- P2では現行キャラクターの同一性、輪郭、毛並み、色面、口腔表現を最低限維持し、写実化を要求しない。
- RTX 3060 Ti 8GBのローカル実行を優先する。有料・クラウド利用はmi3sanの自発的明示または提案への明示承認がある場合だけ許可する。

正本は `docs/adr/001-next-character-comparison-boundaries.md` とする。

`PROPOSED`はP0の実装要件ではない。P0計画で仕様と受入条件を具体化し、mi3sanが承認した項目だけ別ADRへ昇格する。

## 3. 比較で解く問い

比較の主質問:

> 適切な素材と制作技能を与えたとき、どの表現方式が、猫寺の要求する画風と顔下部の構造連動を、許容可能な制作・計算・運用コストで実現できるか。

副質問:

- 正面中心と小さなhead turnで、品質順位は変わるか。
- 構造的な正しさと2D画風の維持は、どこでtrade-offになるか。
- 追加表情、別キャラクター、別cameraの増分コストはどれくらいか。
- artistが失敗を特定し、局所修正し、同じ結果を再生成できるか。
- OSS化できる境界は、renderer、adapter、asset、runtime、weightsのどこか。
- RTX 3060 Ti 8GBとWindows localでどこまで閉じたloopが成立するか。

比較しない問い:

- 音声認識や音素推定の優劣
- 任意の完成画像から可動assetを復元する汎用system
- 本編42カットを直ちに次期方式へ移行する工程
- 一つのweighted scoreによる自動採用

## 4. 現行方式から確認済みのこと

現行コードは `a/i/u/e/o/closed` の6状態を選び、静止した顔画像へ口PNGを局所配置する。`src/components/Character.tsx`では、顔本体と口パッチが別の表現として動く。

実映像と既存QCで観測した上限:

- 顎骨、唇、マズル、頬、顎下が一体で変形しない。
- パッチ境界で毛、陰影、輪郭、体積の連続性が切れる。
- 口腔、歯、舌、隠れ領域の前後関係を表現できない。
- 非stand poseへ同じ口patchをpose別anchor/scaleで合わせる必要が生じた。
- 離散状態間の時間連続性を表現側で保証できない。

ここから確定できるのは、「素材契約に存在しない構造を局所rendererだけで回復する方式には上限がある」ことまでである。「同じPNGを別方式へ投入した比較が失敗した」とはまだ観測していない。

## 5. 候補分類

候補IDは `baseRepresentation` と `enhancementLayer` の組で表す。enhancementをbaseと排他的な一候補として扱わない。

### 5.1 Base representation

| ID | 系統 | 表現の正本 | 得たい判断 | 現在の扱い |
|---|---|---|---|---|
| A | 局所離散2D | 現行口patch + pose画像 | 現行の最低基準と既知failure | 必須baseline |
| B1 | 全頭部離散lookup | 完成頭部state集合 | patch境界を消すだけで得られる改善とstate explosion | 短尺対照、finalist可否はOPEN |
| B2 | 手描き／vector keyframed 2D | key pose、中割り、vector morph | 2D画風で到達できる短尺の品質上限 | T1/T3/T8の品質上限対照 |
| C | 連続2Dパラメトリック | layer、mesh、deformer、mask、draw order | 正面2D画風と連続制御の両立 | 本候補 |
| D | 2.5D解剖rig | layer/plate/浅いgeometry、jaw、depth | 2D画風とvolume/occlusionの折衷 | 本候補 |
| E | 完全3D rig | volume mesh、armature、corrective shape、shader | 口腔、view、再利用の上限 | 本候補 |

### 5.2 Enhancement layer

| ID | layer | 接続対象 | 得たい判断 | 旧分類 |
|---|---|---|---|---|
| X0 | none | A/B1/B2/C/D/E | base単体の能力とfailure | なし |
| X1 | manual cleanup | 主にD/E、必要なら他base | 構造を維持しながら手描き画風へ近づける効果とrebase cost | F |
| X2 | neural redraw | 対応可能な複数base | 高周波detail・画風変換とidentity/temporal drift | G |
| X3 | neural residual | 主にC/D/E | deterministic fallbackを残したappearance補正 | H |

全組合せの直積を制作しない。base単体で特定されたfailureを改善できるlayerだけを、追加投資の判断後に接続する。manifestは `baseRepresentation` と `enhancementLayer` を別fieldで持つ。

物理simulationは独立したbase/enhancementではなく、C/D/E内のsecondary motion実装として扱う。方式固有の物理を共通入力へ強制しない。

B1をfinalistから除外する初稿判断は撤回する。B1の状態数と増分コストは実測し、品質と運用の両面から判断する。

## 6. 共通化するもの、しないもの

### 共通化する

- Character Bible
- Performance Intent
- Observable Referenceの定義と許容差
- timebase、frame区間
- 基準cameraと比較crop
- 出力の色・alpha・pixel contract
- テストsequence
- artifact manifest
- effort/provenance記録
- 評価手順

### 方式固有にする

- layer分割、mesh、topology、skeleton、shape、draw order
- 口腔、歯、舌、隠れ領域の実装
- native control、constraint、corrective
- texture、shader、line、groom
- key poseと中割り
- training data、latent、weights
- renderer、sample数、内部解像度
- artist向け編集UI

### 共通化してはいけない

- 同じPNG
- 同じ頂点数やtopology
- 同じboneやShape Key
- 同じnative parameter名
- 同じ制作手順
- 全方式へ同じtool経験を持つ担当者

## 7. 三層Motion Contract

### 7.1 Performance Intent

演技として何を起こしたいかを示す。解剖やrig操作を指定しない。

v0.1候補:

- `neutral_hold`
- `speech_opening`
- `speech_closure`
- `speech_spread`
- `speech_round`
- `left_right_asymmetry`
- `large_open_emphasis`
- `tongue_presence`
- `head_orientation_target`
- `continuous_performance`

各eventは `start`, `end`, `strength`, `side`, `easing class`, `priority`を持てる。`jaw boneを15度回す`や`shape keyを0.7`はここへ書かない。

### 7.2 Observable Reference

結果として画面または基準空間で観測したい状態を定義する。

v0.1候補:

- mouth aperture ratio
- mouth width ratio
- lip/contact state
- left/right corner displacement
- muzzle outer contour
- visible oral-cavity ratio
- tongue visibility
- teeth/tongue/ lipのocclusion order
- head poseまたは基準camera上のlandmark projection
- silhouette continuity

Observable Referenceは全方式へ同じ形を強制するground truthではない。意図が再現されたか、方式間で何が違うかを測る共通物差しである。手描き2Dではartistのreference drawing、3Dではlandmark projection、ニューラルではtracking結果など、取得方法をmanifestへ記録する。

各observableは、値だけでなく次の測定契約を持つ。

- `support`: `required` / `optional` / `unsupported`
- `method`と`methodVersion`
- `coordinateSpace`
- `tolerance`
- `confidence`、または`manualAnnotation=true`
- `temporalScope`: `singleFrame` / `frameInterval`
- manual annotationの場合はannotatorと根拠artifact

測定不能、測定誤差、adapter非対応を、表現方式の品質failureへ自動変換しない。`unsupported`は欠損値として明示し、0や成功値で埋めない。

### 7.3 Adapter Native Controls

方式内部でintentとobservableを実現する制御。

例:

- sprite state ID
- key drawing / exposure
- vector control point
- Live2D parameter
- jaw bone rotation
- blend/shape key weight
- constraint、simulation input
- neural latent、conditioning map、seed

adapterは各intent/observableに対し、`native`、`approximated`、`unsupported`、`artist_authored`を宣言する。`unsupported`を0へ丸めて隠さない。

### 7.4 三層を分ける理由

- 同じintentを異なる機構で実現できる。
- native controlの数が多い方式を暗黙に有利にしない。
- 手描き2Dをrig schemaへ従属させない。
- observableとnative controlの差から、adapter biasを検出できる。
- 音素変換は将来、Performance Intentを生成する上流として追加できる。

## 8. 方式別素材契約

### 共通Character Bible

- 正面、3/4、側面の外見基準
- 頭蓋、顎、マズル、頬、耳、目、ひげの比率
- 色、模様、線、塗り、毛、陰影のルール
- neutral、閉口、大開口、spread、round、左右非対称のreference
- 歯、舌、口腔の見え方と禁止表現
- 基準camera、照明、背景
- 同一性を判定するlandmarkとsilhouette

### A / B1

- 完成pose/state画像
- stateの意味と許可遷移
- anchor、scale、mask、crossfade規則
- state追加時の制作量

### B2

- key drawing、breakdown、中割り
- exposure sheetまたはvector timeline
- line、palette、brush、cleanup規則
- 手動修正frame一覧
- source fileとlossless export

### C

- 分割layer、隠れ領域、変形余白
- mesh、deformer、mask、draw order
- 唇、口角、マズル、頬、下顎、顎下毛、ひげ根元
- 口腔、歯、舌
- keyformと組合せ補正
- Editor/runtime/version/license manifest

### D

- view-aligned layer/plate/浅いgeometry
- 頭蓋、下顎pivot、口腔volume
- lip/muzzle/cheek topology
- armature、constraint、shape/corrective
- depth、occlusion、valid camera range
- 毛、ひげ、lineの追従規則

### E

- 正面、側面、3/4 model sheet
- deformation topology
- 頭蓋、下顎、口腔、歯、舌
- armature、weight、facial shape、corrective
- UV、texture、shader、groom、line
- camera、light、color management、render settings

### X1: manual cleanup

- 対象baseと再生成可能なbase artifact
- cleanup対象frameとlayer
- base差分、修正理由、適用範囲
- 再render時のrebase規則

### X2 / X3: neural redraw / residual

- datasetの由来、同意、license
- identity referenceと必要view/expression
- conditioning、tracking、model、weights、seed
- environment/container hash
- temporal/identity failure
- 対象baseと、layer無効時のfallback

## 9. Artifact Contract v0.1候補

各adapterは次を出す。

```text
artifacts/<run-id>/<adapter-id>/
  manifest.json
  conformance.json
  evaluation.json
  frames/000000.png ...
  debug/
  observable/
  metrics.json
  logs/
  asset-contract.md
  known-failures.md
```

### Timeline

- rational timebase (`fpsNumerator` / `fpsDenominator`)
- frame 0の意味
- half-open区間 `[startFrame, endFrame)`
- durationからframe数への丸め規則
- frame countと欠損禁止

### Pixel / Color

- container/codecではなくframe format
- bit depth、channel、pixel format
- color primaries、transfer、matrix、range
- ICC profileまたはOCIO config/view/hash
- working space、exposure、tone mapping、view transform
- straight / premultiplied alpha
- matte/background color
- pixel aspect ratio
- dithering規則

### Camera / Canvas

- coordinate system、handedness、up/forward axis、unit
- perspective / orthographic
- focal lengthまたはequivalent FOV、sensor相当
- camera extrinsics
- crop前canvas
- comparison crop rectangle
- safe areaとreference landmark

### Rendering

- renderer/version
- anti-aliasing、sample数、filter
- transparencyとbackground composite規則
- seedと決定性設定
- debug passの意味

### Provenance / Effort

- adapter/source commit
- asset hash、intent hash、observable hash
- commandとenvironment version
- CPU/GPU/driver、peak VRAM、時間、容量
- operator、関連技能、tool経験
- person-hours、iteration、manual correction
- external assetとlicense
- success / failed / partial

### Validatorと表示層

`conformance.json`はRemotionではなく独立benchmark CLIが生成する。schema、frame欠損、hash、timebase、pixel/color、alpha、camera/crop、成功状態など、artifact contractへの適合だけを検査する。

`evaluation.json`は自然さ、同一性、時間連続性、視覚品質、制作量、計算資源などを記録する。自動計測と人間評価を区別し、`conformance=pass`から品質合格を導出しない。

Remotionは原則として`conformance=pass`のartifactだけを通常比較へ載せる。conformance失敗artifactを表示する場合は、赤いinvalid表示を付け、通常候補と混同しない。

## 10. 比較sequence

| ID | Intent | 主に見るもの |
|---|---|---|
| T0 | neutral hold | 同一性、静止時noise/drift |
| T1 | opening ramp | 顔下部の連動、口腔、volume |
| T2 | spread / round | 唇、マズル、頬、contour |
| T3 | open中のclosure | 接触、歯の隠れ、occlusion |
| T4 | 左右非対称 | 独立制御、同一性 |
| T5 | large open + tongue | 口腔、tongue、clip |
| T6 | 二軸combination sweep | 組合せ破綻、補正不足 |
| T7 | yaw ±15° / pitch ±10°内の動作 | view依存、layer gap、volume |
| T8 | 6〜10秒performance | 通常速度の自然さ、coarticulation |
| T9 | 速度変化・hold・方向反転 | temporal continuity、overshoot、flicker |

T7の暫定最大値は `GOV-013` として決定済みである。本番camera rangeではなく、P1で方式差を露出する比較範囲として使う。

P1最小集合は `T0 + T1 + T3 + T6 + T7 + T9` とする。B2品質上限対照は少なくとも `T1 + T3 + T8` を持つ。

## 11. 公平性: 二つの比較トラック

### Track A: 固定予算

目的: 同じ投資で得られる到達点を比較する。

共通化:

- person-hours
- iteration上限
- compute時間または課金上限
- 共通referenceとreview回数

方式ごとに適切なoperatorを使ってよい。ただし、operatorの経験年数、tool経験、外部template、manual correctionをmanifestへ残す。

### Track B: 到達品質

目的: 方式へ適切な専門技能を与えた場合の品質上限を比較する。

- 方式ごとのspecialistを許可
- 改善履歴と追加投資を保存
- 連続するreview cycleで主要failureが改善しない、またはmi3sanが十分と判断するまで継続
- 飽和までの累積person-hours、compute、asset量を結果の一部とする

各review cycleは次を一組で保存する。

- 対象failure IDと仮説
- 追加person-hours、compute、外部費用
- before / after artifact
- 改善した指標、改善しなかった指標、新たなfailure
- 次cycleを継続する理由、または停止する理由

「担当者の感覚でこれ以上無理」を飽和根拠にしない。停止判断は保存されたcycle履歴から再検討可能にする。

Track Aの勝者とTrack Bの勝者が違っても矛盾ではない。「今の予算で採用する方式」と「将来投資する価値のある方式」を分けて判断できる。

## 12. 評価

### 視覚品質

- 貼り付け感
- 顎を起点とする顔下部連動
- lip/corner/muzzle/cheekの形状とvolume
- teeth/tongue/oral cavityのocclusion
- fur/whisker/line/shadingの連続性
- neutralからextremeまでの同一性
- 組合せ破綻
- view依存
- temporal drift、flicker、速度変化

### 制作・運用

- 初回素材制作
- 新表情、新character、新cameraの増分
- artistの局所修正可能性
- headless再生成、version lock
- render/training時間、peak VRAM、容量
- runtime、Editor、asset、weightsのlicense

### Blind presentation

- 方式名とtool名を隠す
- 順序をrandomizeする
- 左右配置を入れ替える
- 同じ映像をduplicateとして混ぜる
- mi3sanの同一映像判定の一貫性を確認する
- 「差なし」「判定不能」を許可する

mi3sanの一次判定と、ラピスのfailure指摘は別記録にする。制作コストは視覚判定後に開示する。

## 13. 投資順序

### P0: 比較契約（`PROPOSED`）

目的:

- Character Bible
- Intent / Observable contract v0.1
- artifact contractと独立validator境界
- comparison presentation
- baselineの再現

goal段階レビューとP0前blockerは解消した。次にオービットがP0の詳細タスク、依存関係、受入条件をplanとして作る。P0計画は `PROPOSED` 項目を無条件に採択せず、mi3sanが実装範囲を承認できる粒度へ分解する。

### N0: neural feasibility（比較外）

P0後半またはP1前に、小さく確認する。

- stylized catへ適用できる入力形式か
- 必要な教師データと権利
- RTX 3060 Ti 8GBでinference/低解像度spikeが動くか
- identity drift、temporal drift
- model、weights、datasetのOSS再配布境界
- cloudが必要な場合の追加費用

N0は品質順位を付けない。P2/P4へ残す価値があるかだけを判断する。

### P1: Mechanism evidence（`PROPOSED`）

- A、C、D、Eを中心にT0/T1/T3/T6/T7/T9
- B1はstate増加とtransitionを確認
- B2は品質上限対照の制作条件を確認
- 画風順位ではなく、自由度、occlusion、view、temporal、再生成を確認

### P2: Styled comparison（`PROPOSED`）

- P1/N0後に残った候補
- Track AとTrack Bを分ける
- Character Bibleに沿ったhead bust
- B2を短尺の2D品質上限対照として含める
- X1 manual cleanupはD/Eなどのbaseでstyle gapが主要failureと確認された場合に追加

### P3: Production slice（`PROPOSED`）

- 上位候補を実台詞6〜10秒へ拡張
- 耳、目、ひげ、呼吸、演出を含む
- 修正1回のcostと再renderを測る

### P4: Neural enhancement本比較（`PROPOSED`）

- N0を通過
- 改善対象がpixel/region/frameで特定
- data/licenseが用意できる
- deterministic fallbackがある
- 複数seed/runの分散を比較する
- X2 neural redrawとX3 neural residualを対象baseとの組で比較する

## 14. 投資の質的比較

現時点では数値pointを置かない。

| Base | 初回素材 | specialist依存 | compute | 不確実性 | 主な支配項 |
|---|---|---|---|---|---|
| A | 低 | 低 | 低 | 低 | patch品質上限 |
| B1 | 中〜高 | 中 | 低 | 中 | state直積 |
| B2 | 高 | 非常に高 | 低 | 中 | drawing/cleanup人時 |
| C | 中〜高 | 高 | 低〜中 | 中 | layer設計、組合せ補正 |
| D | 高 | 高 | 中 | 高 | topology、line/fur、view範囲 |
| E | 非常に高 | 非常に高 | 未実測 | 高 | model、rig、groom、NPR |

| Enhancement | 追加素材 | specialist依存 | compute | 不確実性 | 主な支配項 |
|---|---|---|---|---|---|
| X0 none | なし | なし | 追加なし | 低 | base単体のfailure |
| X1 manual cleanup | baseに追加 | 非常に高 | 低〜中 | 高 | cleanup/rebase |
| X2 neural redraw | data依存 | 高 | 未実測 | 非常に高 | data、VRAM、drift、license |
| X3 neural residual | base + data | 非常に高 | 未実測 | 非常に高 | residual dataとfallback |

`未実測`は悲観・楽観のどちらにも読み替えない。RTX 3060 Ti 8GBでの最小実験後に `EXPERIMENT_RESULT` として更新する。

## 15. Remotionとbenchmark coreの境界

これは `PROPOSED` である。

### Benchmark core / CLI

- conformanceとevaluationのschemaを別管理
- manifest/schema検査
- frame欠損、hash、timebase
- pixel/color/alpha/camera/crop
- artifact success状態
- deterministic rerun比較
- `conformance.json`生成
- 自動evaluation metricの出力。ただしconformance判定へ混ぜない

### Remotion

- conformance済みartifactの横並び
- normal / slow / crop
- debug overlay、control/observable表示
- difference/contact sheet
- blind presentationのrandomize
- review動画

### Adapter

- native asset読込み
- intent/observableからnative controlへのmapping
- 方式固有render
- debug passとprovenance出力

Remotionにvalidatorを置かないことで、表示不具合とartifact不具合を分離する。Remotionが不採用になっても、artifact、conformance、evaluationは残る。

## 16. License境界

### Blender

- Blender本体: GPL
- Blenderで制作したartwork: Blender本体のGPLが自動適用されるわけではない
- `bpy`を使いBlenderと結合して配布するscript/add-on: GPL互換性を個別確認
- texture、font、HDRI、model: 各asset license
- `.blend`内の埋込みscript: 権利とsecurityの双方を確認

したがって「BlenderだからOSS上安全」とは書かない。

### Live2D

- Editor利用条件
- Cubism Core
- SDK source部分
- Publication License
- model asset
- 出力動画

を分離する。Live2D adapterを作る場合も、専有runtimeをOSS coreへ同梱しない。

### Neural

- code
- weights
- dataset
- base model
- tracker/3DMM
- output terms

を分離する。codeが公開されていても、非商用weightsや再配布不可datasetならOSS referenceにはできない。

## 17. 最大リスク

### 観測済み

- 素材契約にない構造を局所rendererで回復しようとし、貼り付け感と非連動が生じた。
- 未観測の比較リスクをAP-004へ観測済みとして登録した。
- 未承認のRemotion境界をAGENTS不変条件へ先に昇格した。

### 将来リスク

- artist差をarchitecture差と誤認する。
- intent/observable contractが一方式へ寄る。
- grayboxの勝敗を最終画風の勝敗にする。
- 3Dの未完成NPRを3D構造の上限とみなす。
- neuralのbest sampleだけを見る。
- B2を量産性だけで切り、2D品質上限対照を失う。
- enhancement layerをbase representationと排他的な候補として比較する。
- conformance passを視覚品質合格と誤認する。
- Observable Referenceの測定誤差を方式failureと誤認する。
- Track Bを停止根拠のない「飽和」で打ち切る。
- 色、alpha、camera差を方式差と誤認する。
- 8GBで動く／動かないを実測前に確定する。
- MCPの操作成功を再現可能なpipelineと混同する。

将来リスクはアンチパターン台帳へ登録しない。実際に観測した場合だけ証拠と共に昇格する。

## 18. mi3sanの判断事項

### P0計画前blocker

- GOV-014: 最初の候補選定は事前レンダーだけ。リアルタイム性能は後段評価。**決定済み**
- GOV-016: RTX 3060 Ti 8GBのローカル実行を優先。有料・クラウドはmi3sanの自発的明示または提案への明示承認時だけ。**決定済み**

### 後続段階blocker

- GOV-013: P1実行前。yaw ±15°、pitch ±10°。**前倒し決定済み**
- GOV-015: P2計画前。現行キャラクターの同一性、輪郭、毛並み、色面、口腔表現を維持し、写実化は不要。**前倒し決定済み**

決定の正本は `docs/adr/001-next-character-comparison-boundaries.md` とする。

### P1/P2まで延期可能

- 猫寺固有assetの公開範囲
- 完全OSSを必須とする範囲
- 専有Editor/runtime許容
- 最終評価軸の重み
- 長期運用で必要な別character数
- 本番camera range

延期事項をP0計画のblockerにしない。ただし各artifactのlicense/provenance記録は最初から行う。

## 19. 現時点のアトラス判断

方式を一つに絞る根拠はまだない。

情報価値の高い順序は、比較契約、早期N0、view/temporalを含むmechanism evidence、B2を含むstyled comparison、production slice、neural/residual本比較である。

事前仮説:

- 正面中心・2D画風優先ではB2/C/Dが強い可能性がある。
- view、口腔、別camera、再利用ではEが強い可能性がある。
- X1はD/Eなどのbase構造を維持しながらstyle gapを埋めるenhancementになり得る。
- X2/X3は高周波detailを改善し得るが、stylized cat、8GB、data、license、driftが未確認である。

これらは `PROPOSED` または将来リスクであり、採用判断ではない。goal段階レビューとGOV-013〜016の判断は完了した。次のアクションは、オービットによるP0計画化と、その計画に対するmi3sanの承認である。

## 20. 技術参照

- Remotion frame-driven presentation

  https://www.remotion.dev/docs/use-current-frame
  https://www.remotion.dev/docs/sequence

- Live2D deformer / parameter / license

  https://docs.live2d.com/en/cubism-editor-manual/deformer/
  https://docs.live2d.com/en/cubism-editor-manual/edit-parameters/
  https://www.live2d.com/en/sdk/license/

- Blender LTS / requirements / Python / license

  https://www.blender.org/download/lts/4-5/
  https://www.blender.org/download/requirements/
  https://docs.blender.org/api/current/
  https://docs.blender.org/manual/en/latest/getting_started/about/license.html

- OpenColorIO / glTF validation

  https://opencolorio.readthedocs.io/en/stable/guides/using_ocio/using_ocio.html
  https://github.com/KhronosGroup/glTF-Validator

- Hand-drawn/vector 2D候補

  https://opentoonz.github.io/
  https://www.synfig.org/

- Neural avatarの環境・data・license例

  https://github.com/YuelangX/Gaussian-Head-Avatar
  https://github.com/ShenhanQian/GaussianAvatars
