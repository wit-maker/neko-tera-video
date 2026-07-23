# 次期キャラクター表現基盤: 環境拡張戦略

最終更新: 2026-07-23

状態: **アトラス提案・未承認**

対象: 設計、実装、観察、修正、再検証を閉じたループにするための操作環境

レビュー状態: ラピス承認済み。個別ツールの導入はmi3san未承認。

## 0. 結論

ツール数を増やすことを進捗とみなさない。追加するのは、候補方式の正しい試作、方式非依存の検証、または再現可能な公開に必要なものだけとする。

現段階の提案は次の通り。

1. **P0の契約設計だけなら、新しいMCPは必須ではない。** 現在のNode.js、TypeScript、FFmpeg、GitHub、Serena、ローカル画像確認で進められる。
2. 最初の実artifactを合格させる前に、表示層から独立した画像・色・時刻validatorが必要になる。
3. 2.5D/3DのP1前に、version固定したBlender LTSとBlender Python CLIが必要になる。Blender MCPは必須にしない。
4. 手描き2D、Live2D、ニューラルは、その候補を実験するときだけ個別環境を追加する。
5. OSS公開用のCI、SBOM、license監査、大容量asset配布は、方式選定後に追加する。

費用とクラウドの権限境界は `docs/adr/001-next-character-comparison-boundaries.md` に従う。ローカルRTX 3060 Ti 8GBを優先し、有料・クラウド利用を本書だけで承認済みとみなさない。

## 1. 現在の実機状態

2026-07-23のローカル確認結果:

| 項目 | 状態 |
|---|---|
| OS | Windows 11系 (`Microsoft Windows NT 10.0.26100.0`) |
| GPU | NVIDIA GeForce RTX 3060 Ti / 8192 MiB / driver 610.74 |
| Node/TypeScript/Remotion | 既存リポジトリで利用中 |
| FFmpeg / ffprobe | インストール済み |
| Blender | 未導入 |
| OpenImageIO / OpenColorIO CLI | 未導入 |
| glTF Validator | 未導入 |
| Krita / Synfig / OpenToonz CLI | 未導入 |
| Docker Desktop | clientあり、daemon停止 |
| WSL2 | `docker-desktop`のみ。一般Linux環境は未構成 |
| Codexの視覚確認 | ローカルPNGの表示、contact sheet、動画成果物の検分が可能 |

RTX 3060 Ti 8GBが「完全3Dに十分」「ニューラル学習に不十分」と現時点で断定してはならない。Blender公式の推奨GPU欄は8GBを挙げているが、毛、texture、Cycles、解像度、sample数で必要量は変わる。各候補の最小sceneでpeak VRAMを実測して判断する。

## 2. 接続方式の優先順位

1. **version固定CLI**: 再現、ログ、headless実行、CIへ最も移しやすい。
2. **Python/Node API**: scene構築、検査、batch renderをGit管理できる。
3. **GUI + 記録済み手順**: artist判断が必要な制作に使う。正本はsource assetとexport結果。
4. **MCP**: 反復速度を上げる場合に追加する。MCPがなくてもCLI/APIで再現できることを前提にする。

MCP経由の操作履歴だけを再現手順にしない。`.blend`、`.kra`、`.sifz`などのsource assetと、構築・検査・export script、version、設定、出力hashをGitまたはartifact storageへ残す。

## 3. PoC開始前に必要な最小構成

### 3.1 Benchmark Core

| 項目 | 内容 |
|---|---|
| 実現すること | timebase、frame、色、alpha、camera、crop、hash、成功状態を方式非依存に検査する |
| 現在の不足 | 現行validatorは次期比較artifact contractを知らない |
| 接続 | TypeScript CLI。FFprobeと画像metadata readerを子processで呼ぶ |
| 視覚確認 | validator合格後のPNG/contact sheetをCodexで確認 |
| Windows / 8GB | CPU処理。問題なし |
| local / 課金 | local、追加API課金なし |
| license / 公開 | リポジトリ自身のOSS方針で公開可能 |
| version / fallback | package-lock固定。Remotionなしでも単独実行 |
| 安全境界 | manifestが指定した任意commandをvalidatorから実行しない。検査対象は許可root内の読取りだけ |

これはP0で設計対象となるが、詳細タスク化はmi3san承認後にオービットが行う。

### 3.2 OpenImageIO / OpenColorIO

| 項目 | 内容 |
|---|---|
| 実現すること | bit depth、channel、色変換、pixel差分、OCIO configの検査 |
| 現在の不足 | FFprobeだけではPNG/EXRの色管理とpixel差分を十分に検証できない |
| 接続 | `oiiotool`、`idiff`、`ociocheck`のCLI |
| 視覚確認 | 正規化前後のPNGとdifference imageをCodexで表示 |
| Windows / 8GB | Windows対応。CPU中心で8GB VRAM非依存 |
| local / 課金 | local、OSS、API課金なし |
| license / 公開 | OpenColorIOはBSD-3-Clause。OpenImageIOも採用時にrelease licenseを固定確認する |
| version / fallback | versionとOCIO config hashをmanifestへ記録。導入不能時はPNG限定validatorでP0を進め、異方式artifactの正式比較は保留 |
| 安全境界 | 外部取得したOCIO config/LUTはhash固定。変換対象pathをworkspace配下へ限定 |

P0の概念設計にはなくてもよいが、異なるrendererの実frameを比較合格にする前には必要である。

### 3.3 Blender 4.5 LTS + Python CLI

| 項目 | 内容 |
|---|---|
| 実現すること | 2.5D/3Dのscene構築、rig検査、headless render、debug pass、VRAM/時間計測 |
| 現在の不足 | Blender本体とBlender Python実行環境がない |
| 接続 | Blender CLI `--background --python` と `bpy`。GUIはartist制作時だけ |
| 視覚確認 | PNG/EXR、wire、normal、depth、bone overlayをCodexで表示 |
| Windows / 8GB | Blender 4.5 LTSはWindows対応。8GBでhead bustが成立するかはP1前の実測対象 |
| local / 課金 | local、無償。クラウドは任意 |
| license / 公開 | Blender本体はGPL。artworkの権利と、公開する`bpy`依存script/add-onのGPL互換性を別々に監査 |
| version / fallback | Blender 4.5 LTSをpatch versionまで固定し、scene生成scriptと設定をGit管理。MCPがなくてもCLIで再現 |
| 安全境界 | 外部`.blend`のauto-runを無効。信頼したscriptだけを明示実行し、`--python-exit-code`で例外を失敗へ変換 |

Blender MCPはPoC開始条件にしない。候補ツールが見つかった場合も、任意code実行、file access、network access、undo、対象Blender versionを確認してから、対話制作の補助として採否を判断する。

## 4. 特定方式の検証時だけ必要な構成

### 4.1 B2 手描き／ベクターkeyframed 2D

第一候補を一つに固定しない。

- 手描き品質上限対照: OpenToonzまたはKrita系のframe animation
- vector morph対照: Synfig

| 観点 | 方針 |
|---|---|
| 不足 | 現在はlayer分割、key pose、中割り、vector morphを制作・再exportする環境がない |
| 接続 | GUIで制作し、PNG sequenceをCLIまたは記録済みexportで出す |
| 視覚確認 | lossless frameとsource fileを保存し、通常/slow/cropを比較 |
| Windows / 8GB | Windows対応、GPU負荷は低い |
| local / 課金 | OpenToonz、Synfigはlocal OSS。Kritaも採用時にversion/licenseを確認 |
| 再現 | source file、brush/font、palette、手動補正frame、作業時間をmanifestへ記録 |
| 代替 | OpenToonzが自動exportに不向きなら、Synfigまたはframe PNG正本へ切替 |
| 安全 | SynfigのWindows外部render targetには過去のsecurity注意があるため、untrusted fileを処理せずPNG sequenceへ直接出力する |

手描き制作は完全自動化を成功条件にしない。どのframeを誰が修正したかを記録し、固定予算トラックと到達品質トラックの双方で人時を証拠化する。

### 4.2 連続2Dパラメトリック

Live2D Cubismを候補にできるが、アーキテクチャと製品を同一視しない。

| 観点 | 方針 |
|---|---|
| 不足 | Cubism Editor、runtime、model export、parameter制御環境がない |
| 接続 | EditorはGUI、runtimeは公式SDK。MCPがなければComputer Useまたは手動制作 |
| 視覚確認 | runtimeからlossless frame sequenceをexportして共通validatorへ渡す |
| Windows / 8GB | Windows対応。通常は8GB GPUが主制約になりにくいが実測する |
| local / 課金 | Editor planとPublication Licenseの条件を採用前に確認 |
| license / OSS | Cubism Core、SDK、model、出力動画の条件を分離。専有runtimeをOSS coreへ同梱しない |
| version / fallback | Editor/SDK/model versionを固定。製品不採用時も、連続2D契約をSynfig等で検証できるようにする |
| 安全 | modelやSDKへ埋め込まれたscriptを無条件実行しない。外部assetの権利をmanifestへ記録 |

### 4.3 2.5D／完全3D／手描きcleanup

- Blender CLI/Pythonを正本とする。
- GUI操作はsource `.blend`へ保存する。
- glTF/GLBを交換形式に採用した場合だけ、Khronos glTF Validatorを追加する。
- 手描きcleanupを行う場合は、元frame、cleanup layer、合成規則、修正frame一覧を別artifactとして保持する。

Khronos glTF ValidatorはWindows CLIとJSON reportを提供する。ただしglTFを採用しない`.blend`内部rigの検査は代替できないため、Blender Pythonによるmesh、bone、weight、shape key検査が別に必要である。

### 4.4 N0ニューラルfeasibility

| 項目 | 内容 |
|---|---|
| 実現すること | stylized cat適用性、教師データ、identity/temporal drift、VRAM、license、再配布可能性を小さく確認 |
| 現在の不足 | 一般WSL環境、動作中container daemon、モデル環境、教師データがない |
| 接続 | 原則WSL2またはGPU container。repositoryとcommitを固定 |
| 視覚確認 | seed別frame sequence、difference、identity reference、slow動画をCodexで検分 |
| Windows / 8GB | 8GBで可能なのはmethod依存。まずinferenceまたは低解像度spike。学習可否を推測しない |
| local / 課金 | localで成立しなければ、mi3san承認後だけcloud GPUを使用 |
| license / OSS | code、weights、dataset、base model、出力条件を別々に監査。非商用licenseはOSS候補のreference implementationから除外 |
| version / fallback | container digest、CUDA/PyTorch、commit、weights hash、seedを固定。方式本比較は決定的fallback完成後 |
| 安全 | containerへcredentialを渡さない。workspaceを必要最小限のread-only mountにし、外部取得後は可能ならnetwork無効。untrusted repositoryをhostで直接実行しない |

Docker clientとWSL2は存在するが、現在daemonは停止し、一般Linux distributionもない。N0を承認するまでは構築しない。

## 5. 採用方式の本実装またはOSS公開時に必要な構成

| 構成 | 目的 | 導入時期と安全境界 |
|---|---|---|
| GitHub Actions CPU validation | schema、manifest、hash、small fixture、license headerを再現 | 方式決定後。外部PRでもsecretなしで動く検査だけ |
| Blender headless smoke render | pinned Blenderでreference frameを再生成 | assetと実行時間がCI許容になった後 |
| GPU/self-hosted runner | neuralまたは重いrenderの再現 | protected branch/manual dispatch限定。untrusted PR codeをself-hosted GPUで実行しない |
| SPDX/REUSE + SBOM | source、dependency、asset、weightsの権利を分離 | 公開候補を切り出す前 |
| 大容量artifact storage | model、frame、weights、golden outputのversion管理 | Git LFS quota、GitHub Releases、OCI等を容量と公開条件で選択 |
| schema docs生成 | adapter追加者向け契約を実装と同期 | schemaがacceptedになった後 |
| provenance/signing | release artifactとsource commitの対応 | OSS releaseまたは第三者配布時 |

## 6. 導入しないもの

- 操作履歴を再現できないGUI自動化だけのworkflow
- raw credentialまたは広いfilesystem権限を要求するMCP
- 対応Blender/Cubism/versionを固定できないbridge
- model、weights、datasetのlicenseが確認できないニューラルrepository
- 8GBで動くという推測だけを根拠にした学習環境
- 比較方式が決まる前の大規模CI、GPU runner、大容量asset基盤

## 7. 導入順序

1. 現在の構成でP0の契約と判断状態を確定
2. 独立validatorに必要な画像・色CLIを承認
3. Blender 4.5 LTSを導入し、D/Eの最小sceneでWindows・8GB実測
4. B2、連続2D、N0は比較候補を実行する直前に個別承認
5. 採用方式が見えた後に、CI、license監査、配布基盤を導入

追加コストに対する判断材料の増加が最大なのは、現時点では「Blender MCP」ではなく、**version固定Blender CLI/Python + 独立artifact validator**である。MCPはそのループが成立した後、対話制作の速度が律速になった場合に評価する。

## 8. 一次資料

- Blender 4.5 LTS（2027年7月までsupport）

  https://www.blender.org/download/lts/4-5/

- Blender system requirements

  https://www.blender.org/download/requirements/

- Blender Python API

  https://docs.blender.org/api/current/

- Blender scripting security

  https://docs.blender.org/manual/en/latest/advanced/scripting/security.html

- OpenColorIO CLIとWindows導入

  https://opencolorio.readthedocs.io/en/stable/guides/using_ocio/using_ocio.html
  https://opencolorio.readthedocs.io/en/latest/quick_start/installation.html

- Khronos glTF Validator

  https://github.com/KhronosGroup/glTF-Validator

- Synfig（Windows、GPL、vector tween）

  https://www.synfig.org/

- OpenToonz

  https://opentoonz.github.io/

- Live2D SDK Publication License

  https://www.live2d.com/en/sdk/license/

- Neural avatarの環境・データ・license例

  https://github.com/YuelangX/Gaussian-Head-Avatar
  https://github.com/ShenhanQian/GaussianAvatars
