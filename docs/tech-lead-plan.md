# Tech Lead 技術実行計画: 猫寺会話劇ショート動画 — QC・outro・納品

> **本書の位置づけ**: CTO引き継ぎ書(`docs/cto-handoff.md`)とPMプロジェクト計画を**確定した前提**とし、
> Developer/AIエージェントが**そのまま実装着手できる**技術実行計画へ落とし込んだTechLead成果物。
> CTO/PMへの差し戻し・追加質問は行わない。以降の技術判断はTechLeadが本書で確定する。
> **確定判断は §0「TechLead確定事項」にすべて集約**。実装者はまず §0 と §1(DoR/DoD)を読むこと。
> **着手の入口 = §4 F0-1**(フレーム早見表の生成)。
> **確定版(2026-07-21)**: PMドラフトをTechLeadが実データで裏取りし、行番号誤り3件・video.json実データ差異1件・
> qc-checklist.mdとADR-9の表現齟齬1件を修正して確定。詳細は本節末尾の追記行を参照。

---

## 0. Tech Lead 確定事項(Developerが疑問を持たず着手できるための一次情報)

| # | 論点 | 確定 |
|---|---|---|
| TL-1 | バージョン管理(現状 git 非管理) | **git は導入しない**。代替として **スナップショット規約**(§9 State)を採用。素材は `_orig/` 退避、編集ソース(`video.json`/`mouthpatch.py`/`fixbg.py`)は編集前に `backups/<UTCタイムスタンプ>/` へコピー。ブランチ=物理コピーで代替 |
| TL-2 | 検収loudness/TP基準 | **ADR-9 準拠**: 検収ゲート=納品AACの `I=-14±0.5 LUFS` かつ `TP≤-1.0 dBTP`。§2「≤-1.5」は mix内部ターゲット。現行 `-1.4 dBTP` は**合格**。**追記**: `docs/qc-checklist.md`の「WAVマスター -1.5 dBTP以下」表記は**参考値であり検収ゲートではない**(ゲートは納品AAC ≤-1.0 のみ)。現行WAV実測-1.4はADR-9上許容範囲内(目安として>-1.3で mixパラメータ見直しを起票、-1.4はこれも下回るため対応不要)。qc-checklist.md該当項目はこのTL-2に合わせて表現を訂正済み(§17.2-1「測ったが証拠」原則の再適用) |
| TL-3 | §16.4 任意3項目 | **全て非実施・スコープ外**(深度パララックス/ハロー低減チューニング/zod負債)。申し送りのみ |
| TL-4 | §15 既知問題1〜3 | **必須QC判定**。実寸視聴で採否、不合格のみ修正。証跡(still/タイムコード)を検収報告に添付 |
| TL-5 | stillフレーム番号の出所 | §14の値(話速1.2倍旧値)は**使わない**。必ず `npx tsx pipeline/print-timing.ts` の**現行**出力を使用 |
| TL-6 | 手編集禁止フィールド | `sound.sfx` / `subtitle` / `patch-config.json`(×2) / `audio-manifest.json`。恒久変更はスクリプト定義を変える |
| TL-7 | 全編render条件 | **修正が出尽くしてから1回のみ**。修正ごとのrenderは禁止。検証は該当stillのみ |
| TL-8 | 並列化の単位 | QC検分は**シーン単位(7シャード)で並列**、修正は**ドメイン単位で並列**(fixbg→cutout依存鎖のみ直列)。**TechLead検証済み**: video.json実データで `scenes.length=7` × 各 `cuts.length=6` = 42 を確認。シャード境界(シーン)は脚本構造そのものと一致し、恣意的分割ではない |
| TL-9 | 発注者タッチポイント | **outro.mp3配置** と **最終検収承認** の2点のみ。feature単位ポーリング禁止 |
| TL-10 | エージェント実体 | Claude Code サブエージェント。役割別に §7 で `agentType` とツール要件を確定 |
| TL-11 | 無音カットの字幕欠落 | `s1c1`・`s7c1` はセリフ無し(`dialogue:[]` + `fixedDurationSec`指定)につき `subtitle` フィールド自体が**存在しない**(仕様通り、欠陥ではない)。F1のQC-Inspectorはこの2カットの字幕チェックリスト項目を「対象外(N/A)」として扱い、不合格判定しないこと |
| TL-12 | Python実行環境の罠 | `.venv/` は **align.py(stable-ts/Whisper)専用**で Pillow/numpy が入っていない。`pipeline/probe.py`/`contactsheet.py`/`mouthpatch.py`/`fixbg.py`/`cutout.py` など画像処理系は**必ず素の `python` コマンド**で実行する(`.venv/Scripts/python.exe`で実行すると`ModuleNotFoundError: PIL`で即失敗)。TechLead実機検証済み |
| TL-13 | 検分ハーネスの事前構築 | ピクセルプローブ(`pipeline/probe.py`)・コンタクトシート生成(`pipeline/contactsheet.py`)・18項目の実行手順(`docs/qc-procedure.md`)は**TechLeadが実装・動作検証済み**。QC-Harness Agent(F0-3/F0-4/F0-5)はゼロから設計せず、これらを実行して疎通確認するだけでよい |

### 現状(TechLead自己再検証済み・§17.2-6)
- `out/final-master.mp4`(490MB, 2026-07-21 22:23)実在。実測: 1080×1920/60fps/h264+AAC、尺 映像303.883s/音声303.916s(差0.033s)、**I=-14.0 LUFS / TP=-1.4 dBTP**。→ §2条件 1・2 達成、3〜6(QC)未判定。
- `public/bgm/outro.mp3` **未配置**(main-soft/main-warm のみ)= F3ブロッカー。
- 派生物健全: audio 45 / alignment 45 / audio-manifest 45行、`patch-config.json` 2箇所 MD5一致、`.venv` python・remotion バイナリ有。
- `encode.ts` はTP実測ログ追加済み(`final: <s>, I=... LUFS, TP=... dBTP`)。

---

## 1. Definition of Ready / Definition of Done

### プロジェクト全体 DoR(着手可能条件) — **全て充足済み**
- [x] CTO/PM成果物が確定。`video.json`(zod検証可)・派生物・ツールチェーン実在。
- [x] 検証手段(print-timing / remotion still / ffprobe / ebur128)が動作環境に存在。
- [x] 現状ベースライン実測済み(上記)。

### プロジェクト全体 DoD(納品成立条件)
- [ ] `docs/qc-report.md` が全42カット網羅、全適用項目 pass(不合格ゼロ)。
- [ ] §2成功条件 1〜6 すべて実測値付きで合格(TL-2=ADR-9典拠)。
- [ ] §15必須3項目の判定+証跡が検収報告に添付。
- [ ] outro反映済み(mix log に BGM未配置warn無し)。
- [ ] `out/final-master.mp4` 最終版 + 検収報告(§2の6項目実測)完成、発注者承認取得。

### Feature共通 DoR / DoD テンプレート
- **DoR**: 依存Featureが完了 / 対象カットのフレーム番号確定 / 編集前スナップショット取得済み / 担当エージェントへ渡すContextスライス(§8)準備済み。
- **DoD**: 完了条件を**測定で**充足(§17.4「作業内容より完了条件」) / 証跡(still/ログ/実測値)を成果物へ添付 / `npm run validate` グリーン(video.json触時) / スナップショットとの差分を記録。

---

## 2. プロジェクト計画(PM確定計画の要約・前提)

7シーン×6カット=42カット・45セリフの縦型ショート(1080×1920/60fps/303.9s)を、`video.json`をSSOTとする
データ駆動パイプラインで完成させる。**フォーマット・尺・ラウドネスは達成済み**。残作業=**QC巡回(唯一の大物)→
不合格のみ修正→outro反映→納品**。品質はエージェントの賢さでなく**検証ループの設計**で決まる(§17.4)。

---

## 3. Feature 分解(WBS Level-1)とマイルストーン対応

| Feature | 名称 | 対応PM-M | ブロッカー | 並列性 |
|---|---|---|---|---|
| **F0** | 検証ハーネス基盤 | M0 | なし(即着手) | 単一・先行必須 |
| **F1** | QC検分スイープ(42カット) | M1 | F0 | シーン7シャード並列 |
| **F2** | 修正実装(不合格のみ) | M2 | F1 | ドメイン並列(F2a/b/c) |
| **F3** | 音声統合(outro) | M3 | **outro.mp3配置(発注者)** | F1/F2と並行待機 |
| **F4** | 最終ビルド(render+mix+encode) | M4 | F2完了 かつ F3(配置時) | 単一・1回のみ |
| **F5** | 検収・納品 | M5 | F4 | 単一 |

### 実行順序最適化(クリティカルパス)
```
F0 ──▶ F1 ──▶ F2 ──▶ F4 ──▶ F5      ← クリティカルパス
             (F3: outro配置待ち、F4手前で合流。配置が遅れてもF1/F2は先行)
```
- **F0 は全ての律速**。最優先で1エージェントが確立(§17.2-7)。
- **F1 は7シーン並列**で wall-clock 短縮(1シャード=6カット検分)。
- **F2 は F1完了後**、不合格ドメインを並列(ただし F2b fixbg→cutout は直列鎖)。
- **F4 は1回だけ**。F2の全修正収束 & (配置済みなら)F3統合後にまとめて実行。

---

## 4. WBS(Level-2 タスク分解)・依存関係・完了条件

### F0 — 検証ハーネス基盤 [担当: QC-Harness Agent]
| ID | タスク | 依存 | 完了条件(測定) |
|---|---|---|---|
| F0-0 | `backups/` ディレクトリ作成(TL-1のスナップショット運用の受け皿。現状未作成) | — | `backups/` が実在(空でよい)。以後の video.json/mouthpatch.py/fixbg.py 編集前コピー先として使用 |
| F0-1 | `npx tsx pipeline/print-timing.ts` 実行→42カットの from/dur/秒・総フレームを取得 | — | 出力を `docs/qc-report.md` 冒頭のフレーム早見表に記録。総フレーム数を明示 |
| F0-2 | still生成の疎通: `npx remotion still Main --frame=<F0-1のfrom> --output=out/qc-test.png` | F0-1 | `out/qc-test.png` が**実在しサイズ>0**(exit codeでなくファイルで確認) |
| F0-3 | ピクセルプローブ疎通確認(**ツールは`pipeline/probe.py`としてTechLeadが実装・動作検証済み**。ゼロから作らない) | — | `python pipeline/probe.py out/qc-test.png 100 100` が実行でき、RGBA値を出力する(必ず`python`コマンド。`.venv`不可、TL-12) |
| F0-4 | 合成プレビュー疎通確認(**ツールは`pipeline/contactsheet.py`としてTechLeadが実装・動作検証済み**) | F0-2 | `python pipeline/contactsheet.py out/qc-test-sheet.png out/qc-test.png` が実行でき、シートpngが生成される |
| F0-5 | 検分手順の疎通確認(**手順は`docs/qc-procedure.md`としてTechLeadが18項目分すべて記述済み**。新規に規約を考えない) | — | 任意カット1件(例: s1c2)で`docs/qc-procedure.md`記載の手順を1周実行し、コマンドが全て失敗せず完走することを確認 |
**Feature DoD**: F0-1〜5全完了。**以後の全修正が「40秒/still」で検証可能な状態**(§17.2-7)。F0-3/4/5はTechLead提供物の疎通確認であり、新規設計は不要(TL-13)。

### F1 — QC検分スイープ [担当: QC-Inspector Agent ×7シャード]
| ID | タスク | 依存 | 完了条件 |
|---|---|---|---|
| F1-s1..s7 | 各シーン6カットを `docs/qc-checklist.md` **18項目**(TechLeadが数え直し訂正。旧記載「16項目」は誤り)で検分(頭/中間/末尾still + 再生)。**手順は `docs/qc-procedure.md` に実行手順化済み、そのまま従うこと** | F0 | シーン単位で pass/fail + 根拠を qc-report に記録。**「異常なし」も確認方法を明記**(§17.2-2) |
| F1-K1 | §15-1 ミケ口ハロー: 拡大still+再生で実寸判定 | F0 | 採否+証跡(still/タイムコード) |
| F1-K2 | §15-2 s1c1右柱埋め跡: 全景stillで実寸判定 | F0 | 採否+証跡 |
| F1-K3 | §15-3 先生tea口被覆: teaポーズ発話カット再生で判定 | F0 | 採否+証跡 |
| F1-M | 7シャード+必須3項目をマージし**不合格リスト確定** | 上記全 | 不合格リスト=F2インプット。**マイルストーン境界**(発注者共有) |
**適用除外(TL-11)**: `s1c1`/`s7c1` は無音カットにつき字幕チェックリスト項目を「対象外(N/A)」として扱う(字幕フィールド不在は仕様通り)。
**TP判定(TL-2追記)**: 音のトゥルーピーク項目は納品AAC ≤-1.0 dBTPのみをゲートとする。WAV実測値(現行-1.4)は参考記録とし単独では不合格にしない。
**Feature DoD**: qc-report が42カット網羅、必須3項目に証跡、不合格リスト確定。
**判定規約**: 画像座標不合格は**ピクセルプローブ裏取り+合成プレビュー添付**(§17.2-1)、**表示スケールで**判定(§17.2-4)。

### F2 — 修正実装(不合格項目のみ・反復前提) [担当: ドメイン別 Fix Agent]
| ID | ドメイン | 修正先 | 再実行(§7該当工程のみ) | 依存 |
|---|---|---|---|---|
| F2a | 口/viseme/ハロー | `pipeline/mouthpatch.py` CONFIG(30-66)/POSES(70-82) | `python pipeline/mouthpatch.py` → 該当still | F1 |
| F2b | 背景埋め跡 | `pipeline/fixbg.py`(day 22-36 / eve 116-122) | `fixbg.py` → `cutout.py` → 該当still(**直列鎖**) | F1 |
| F2c | カメラ/ポーズ/黒板/無音尺 | `video.json` `camera`/`chars`/`board`/`fixedDurationSec` | 該当still(パイプライン不要) | F1 |
**各修正の完了条件**: 該当still2〜3枚(昼/夕/対象カット)で**表示スケール再検分し合格** + 証跡添付。
**反復バジェット**: 座標/インペイントは **3〜5ループが正常**(§17.3)。1回収束を前提にしない。
**禁止**: TL-6の手編集禁止フィールド。破壊的処理前に `_orig/` 退避確認(§17.2-8、fixbgは冪等)。
**Feature DoD**: F1不合格の全項目クローズ、オープン不合格ゼロ。**この時点で全編render前の video.json/座標が確定**。

### F3 — 音声統合(outro) [担当: Build Agent / ⛔ 発注者配置待ち]
| ID | タスク | 依存 | 完了条件 |
|---|---|---|---|
| F3-1 | `public/bgm/outro.mp3` 配置確認 | 発注者 | ファイル実在 |
| F3-2 | `npm run mix`(レンダー不要) | F3-1 | stdout に `[warn] BGM 未配置のためスキップ: ...outro.mp3`(mix.ts:99)が**出ない**。`out/master-audio.wav` 更新 |
| F3-3 | `npm run encode` | F3-2 | `out/final-master.mp4` 更新、`final: ... I=... LUFS, TP=... dBTP` ログ捕捉 |
**Feature DoD**: BGM未配置warn不在 + master-audio 更新 + encode成功ログ。

### F4 — 最終ビルド(1回のみ) [担当: Build Agent]
| ID | タスク | 依存 | 完了条件 |
|---|---|---|---|
| F4-1 | video.json/mouthpatch/fixbg に変更あれば `npm run render`(バックグラウンド、約35分) | F2 | **起動確認**(出力生成/プロセス生存)後、**完了確認**(`out/master.mp4` 実在・~490MB・ffprobe尺)(§17.2-6) |
| F4-2 | `npm run mix`(outro配置 or 音変更時) → `npm run encode` | F4-1,F3 | encode検収ログ `final: ... I / TP` 捕捉 |
**注**: F2不合格ゼロ かつ outro配置済みなら **render省略しmix+encodeのみ**でよい(現行master.mp4流用)。
**render厳守**: `--concurrency` 無指定(コア数超過で即死・§17.1-8)、cwd=プロジェクトルート。
**Feature DoD**: master.mp4/final-master.mp4 最終版生成、実測ログ取得。

### F5 — 検収・納品 [担当: Tech Lead / PM共同]
| ID | タスク | 依存 | 完了条件 |
|---|---|---|---|
| F5-1 | PM独立再測: `ffprobe`(尺/フォーマット)+ `ffmpeg -af ebur128=peak=true`(I/TP) | F4 | パイプラインログと独立に §2条件 1・2 を確認 |
| F5-2 | 検収報告作成: §2の6項目に実測値+判定、§15必須3項目の証跡添付、ADR-9典拠明記 | F5-1,F1 | 6項目すべて合格明記 |
| F5-3 | 発注者へ最終承認要請 | F5-2 | 承認取得(マイルストーン境界) |

---

## 5. レビュー戦略

| 対象 | 一次レビュー(自己) | 二次レビュー(独立/敵対的) |
|---|---|---|
| 座標修正(F2a/F2b) | ピクセルプローブ裏取り + 合成プレビュー | 別エージェントが「表示スケールで本当に解消したか」を再判定(敵対的検証) |
| video.json編集(F2c) | `npm run validate`(zod) + `npx tsc --noEmit` | 該当still再検分でレンダリング結果を確認(テキストでなく表示系・§17.2-4) |
| ビルド出力(F3/F4) | encode/mix の検収ログ(I/TP/尺) | **PM独立再測**(ffprobe/ebur128)でログに依存しない裏取り(§17.2-6) |
| QC判定(F1) | チェックリスト逐条 | 「異常なし」シャードは判定ロジック自体を疑い、確認方法の記述を必須化(§17.2-2) |

**レビュー原則**: 「見た」でなく「測った」を証拠とする(§17.2-1)。ゼロ件報告ほど疑う(§17.2-2)。

---

## 6. テスト戦略

- **スキーマ検証(必須ゲート)**: video.json 変更後は必ず `npm run validate`(`pipeline/validate.ts`, zod)。不一致で exit 1。
- **型検査**: TS 変更時 `npx tsc --noEmit` 常時グリーン(§11)。
- **スモークテスト**: `npx tsx pipeline/print-timing.ts` の総フレーム数が想定(約18,236)と整合。
- **回帰基準(ゴールデン)**: 現行 `final-master.mp4`(I=-14.0/TP=-1.4/303.9s)をベースライン保存。再ビルド後に尺・I・TP を diff し、意図しない退行を検出。
- **視覚回帰**: 修正カットの before/after still を合成プレビューで並置。
- **統合テスト**: F4後の final-master に対し F5-1 の実測を通す(=最終受け入れテスト)。
- **音の一発性**: mix/encode は計測駆動で1回着地が正常(§17.3)。2回目が必要なら計測ログを疑う。

---

## 7. AIエージェント担当割り当て(実体・ツール・agentType)

| 役割 | agentType | 担当Feature | 必要ツール | 主なアウトプット |
|---|---|---|---|---|
| **QC-Harness Agent** | general-purpose | F0 | Bash, Read, Write, remotion CLI | フレーム早見表、still疎通、プローブ手順 |
| **QC-Inspector Agent** ×7 | general-purpose | F1(s1..s7) | Bash(remotion still), Read, Write(report), 画像Read | qc-report シーン節、不合格リスト |
| **Fix Agent (mouth)** | general-purpose | F2a | Edit(mouthpatch.py), Bash(python), 画像Read | 修正済み座標 + 検証still |
| **Fix Agent (bg)** | general-purpose | F2b | Edit(fixbg.py), Bash(python fixbg→cutout), 画像Read | 修正済み座標 + 検証still |
| **Fix Agent (direction)** | general-purpose | F2c | Edit(video.json), Bash(validate/still) | 修正済みvideo.json + still |
| **Build Agent** | general-purpose | F3,F4 | Bash(mix/encode/render, ffprobe) | master/final-master + 実測ログ |
| **検収(Tech Lead/PM)** | — | F5 | Bash(ffprobe/ebur128), Write | 検収報告 |

**割当原則**: F2の検分→修正→再検分ループは**同一Fix Agentが所有**(§10 Loop Engineering)。二次レビューのみ別エージェント。
Inspector と Fix は分離(検分の客観性維持)。**agents/*.md(qc.md等)の責務定義を各エージェントのシステム文脈に含める**。

---

## 8. エンジニアリング方針(§10をFeatureに具体化)

### Harness Engineering
- 創造的判断の出力は **video.json書き戻しに限定**、レンダリングコード直編集をさせない。機械変換は冪等スクリプト(sfxcue/typeset/mouthpatch/fixbg)。
- QCループ = **still検分 → SSOT(video.json/座標定義)修正 → §7該当工程のみ再実行 → 再検分**。全編renderは収束後1回(F4)。

### Context Engineering
- 各Fix Agentへ渡すのは **①担当フィールドのzodスキーマ断片(schema.ts該当行)②当該カットのvideo.json断片③関連アセットの絶対パス④該当フレーム番号** のみ。**video.json全文は渡さない**(45行/42カットで肥大)。
- QC-Inspector へは **担当シーンのカットID一覧+各カットの from/dur+checklist** のみ。

### Loop Engineering
- 反復前提(座標/インペイント=3〜5回)と一発工程(mix/encode=1回)を区別してバジェット配分(§17.2-5)。
- **PMはマイルストーン境界のみ確認**(F1不合格リスト確定 / F4完了 / F5承認)。feature単位ポーリング禁止。

### State Engineering
- 状態は全てファイル(video.json + 派生物)。**エージェント間メッセージで状態を運ばない**。
- 適用済み変換はマーカーで冪等化(`meta.speechRateApplied`)。新スクリプトを書かせる場合は `_orig/`退避+マーカーを受け入れ条件に(§17.2-8)。
- **patch-config.json は mouthpatch.py 経由でのみ更新**(public/src 2箇所同時書き=mouthpatch.py:198-202)。手編集で乖離させない。

---

## 9. ブランチ戦略 / 成果物管理(git非管理環境・TL-1)

- **ベース方針**: git 非導入。**物理スナップショットで版管理**を代替。
- **編集前スナップショット(必須)**: `video.json` / `pipeline/mouthpatch.py` / `pipeline/fixbg.py` を編集する前に
  `backups/<UTC yyyymmdd-hhmmss>/` へコピー。ロールバック=コピーで復元。
- **素材の破壊的操作**: 必ず `_orig/` 退避を確認してから(fixbg は `_orig` から再構築するため冪等)。
- **ビルド成果物**: `out/`(master.mp4/master-audio.wav/premaster.wav/mix-filter.txt/final-master.mp4)。
  F4前に現行 final-master を `out/_baseline/` へ退避(ゴールデン回帰用)。
- **QC成果物**: `docs/qc-report.md`(不合格記録・証跡)、`out/qc-*.png`(検分still)。
- **納品成果物**: `out/final-master.mp4` + 検収報告(`docs/acceptance-report.md`)。
- **禁止**: 派生物(sfx/subtitle/patch-config/audio-manifest)の手編集(TL-6)。

---

## 10. リスク管理計画

| リスク | 影響 | 対策 | トリガー |
|---|---|---|---|
| outro.mp3 配置遅延(F3ブロッカー) | 納品遅延 | F1/F2を先行完遂し待ち吸収。F1境界で未配置なら発注者へ督促 | F1完了時点で未配置 |
| 全編renderの「exit 0だが失敗」(§17.1-8) | 無効成果物で工程進行 | 起動確認+完了確認を分離(ファイル実在/サイズ/ffprobe尺)。`--concurrency`無指定、cwd固定 | F4-1着手時 |
| §14タイミング値の陳腐化(現speed≠1.2) | 誤フレームで検分 | stillフレームは必ず print-timing 現行出力から取得(TL-5) | F0-1 |
| 座標修正の未収束(5回超) | ループ発散 | 「構造の混在」を疑い手法分離(§17.1-7)。5回超で手法見直しを起票 | F2各ドメイン |
| ゼロ件QCの見落とし(§17.2-2) | 後工程で大手戻り | 「異常なし」に確認方法記述を必須化、二次レビュー | F1各シャード |
| loudness退行(再mix時) | 検収不合格 | ゴールデン基準と I/TP を diff。>-1.3 でmixパラメータ見直し起票 | F3/F4後 |
| Windows罠(PS5.1 UTF-8 / `\f`パス) | 文字化け/OSError | JSON操作はNode/Python、パスは `os.path.join`(§11/§17.2-10) | 全エージェント指示に明記 |

---

## 11. 品質保証計画

- **測定主義**: 全DoDを測定可能条件で定義(§17.4)。「作業完了」でなく「実測合格」で判定。
- **多重検証**: パイプライン自己ログ + 独立再測(ffprobe/ebur128)の二重化(§17.2-6)。
- **証跡保存**: 判定の根拠(still/タイムコード/実測値)を成果物へ添付。特に §15必須3項目(発注者要求)。
- **典拠の一元化**: loudness/TP は ADR-9(TL-2)。組版・尺は SSOT + timing.ts。黒板はSVG射影(ADR-8)。
- **ゲート**: video.json変更→`validate`グリーン、TS変更→`tsc --noEmit`グリーン、ビルド→検収ログ+独立再測。

---

## 12. Developer/AIエージェント引き継ぎ実装コンテキスト(そのまま着手できる一次情報)

### コマンド早見
```bash
# フレーム番号(検分の起点・毎回現行を取得)
npx tsx pipeline/print-timing.ts
# 代表still(N=print-timingのfrom値。コンポジションID=Main)
npx remotion still Main --frame=N --output=out/qc-<cut>.png
# スキーマ検証(video.json編集後の必須ゲート)
npm run validate
# 音声ミックス→エンコード(outro反映・F3)
npm run mix && npm run encode
# 全編render(F4・バックグラウンド必須・concurrency無指定)
npm run render
# 独立再測(検収・F5)
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -show_entries format=duration out/final-master.mp4
ffmpeg -nostats -i out/final-master.mp4 -af ebur128=peak=true -f null -
```

### TechLead提供の検分ツール(F0で新規設計しない・そのまま使う)
- `pipeline/probe.py`: `python pipeline/probe.py <画像パス> <x> <y> [...]` → RGBA実値を出力
- `pipeline/contactsheet.py`: `python pipeline/contactsheet.py <出力パス> <画像1> <画像2> ...` → 合成プレビューpngを生成
- `docs/qc-procedure.md`: qc-checklist.md 18項目それぞれの実行手順+記録フォーマット。F1担当者はこれに従うだけでよい

### 主要ファイル参照(exploration実測の file:line)
- コンポジション: `src/Root.tsx`(id=`Main`, FPS=60, 1080×1920, durationInFrames=timing.totalFrames 動的)
- 尺算出: `src/lib/timing.ts`(HEAD 0.35s + Σ(実測尺+pauseAfter) + TAIL 0.55s / 定数 schema.ts:190-191)。実測尺は `public/audio-manifest.json` 由来
- 口パク座標: `pipeline/mouthpatch.py` CONFIG(30-66: mouthAnchor/viseme box/eyeAnchors) POSES(70-82: 非stand口 anchor/scale)。PATCH_CANVAS=260、基準1280×1920。両patch-config書出し=198-202
- 背景消し込み: `pipeline/fixbg.py` day(22-36: HOLE/COLS/FILL_X/donor) eve(116-122: FX/FY/DY/TOP_BAND/SEAMS)
- 音: `pipeline/mix.ts`(BGM未配置warn=**99行** `[warn] BGM 未配置のためスキップ: <path>`、2パスloudnorm=230-250、master検収ログ=259行=**LUFS(I)のみ出力。TP計測はmix.tsに無い**)。outro使用=`video.json` 2541/2589/2632(末尾3カット)
- encode: `pipeline/encode.ts`(map+copy+AAC320k+faststart=40-47、尺差>0.1sはwarn継続=33-38、**TP付き検収ログ=59-61行** `final: ...s, I=... LUFS, TP=... dBTP`。TPはencode.tsでのみ計測・出力される)
- スキーマ: `src/schema.ts`(Cut必須 id/title/camera/bg、camera 34-48、CharLayer 111-117、board 52-92/155、SoundSpec=sfx 134-143【禁止】、SubtitleSpec 119-129【禁止】、meta固定 171-173)
- コンポーネント: `CutView.tsx`(合成本体・**BOARD_RECT 15行単独**。14行=BOARD_SURFACE、16行=BOARD_SCALEは別定数) / `Character.tsx`(口パク・目パチ・呼吸) / `ChalkBoard.tsx`(板書持ち越し) / `KaraokeSubtitle.tsx` / `Effects.tsx` / `Grade.tsx` / `Steam.tsx`

### 全エージェント指示に埋め込む共通ヘッダー(§11/§17)
1. **Context**: 担当フィールドのスキーマ断片+当該カットJSON断片+アセットパス+フレーム番号のみ(全文投入禁止)。
2. **Windows**: JSON操作はNode/Python(PS5.1はUTF-8 JSON破壊)、パスは `os.path.join`、スコープ調査は `visible !== false`(生JSONにzod default無し)。
3. **証拠主義**: 画像座標タスクは「ピクセル値サンプリング裏取り」+「合成プレビュー添付」を完了条件に必須化。
4. **表示系検証**: 字幕はレンダリング結果、画像は合成後stillで判定(ピクセル等倍で合否を決めない)。
5. **エラー先読み**: 推測再試行前にエラー候補一覧/実測値を取る(例: コンポジションID=`Main`)。
6. **長時間ジョブ**: 起動確認と完了確認を別タスク化。exit code/通知を信用しない。

---

## 13. 申し送り(スコープ外・続編/CTO管轄)
- 深度パララックス(ADR-7): 続編改善候補として納品報告に記載のみ。要望時はCTOへ差し戻し(技術方針変更を伴う)。
- ミケ口ハロー低減チューニング: §15-1がQC**合格**なら続編候補として記載のみ。**不合格ならF2aで必須修正**。
- zodバージョン負債: CTO管轄。続編セットアップ工程で対応。
- ADR-9 を loudness/TP の典拠として運用。§2「≤-1.5」は mix内部ターゲットの意味に確定(TL-2)。
- 根本原因訂正(記録): WAVマスター自体が -1.4 dBTP(loudnorm 192k→48kリサンプル由来)、AAC変換の追加悪化はほぼゼロ。
- `docs/qc-checklist.md`のWAV TP表記(旧: 「-1.5 dBTP以下」という合否ゲート的表現)は、ADR-9(WAVは参考測定・非ゲート)と字面上矛盾していたためTechLeadが訂正済み(本書§0 TL-2参照)。ADR-9自体は変更していない。
