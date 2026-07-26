# 次期キャラクター表現プログラム — 実行カンバン

**運用状態:** ACTIVE
**基準:** `origin/main`（PR #30 merge 済み）。PR #31〜#39 は提出済み・merge待ちであり `DONE` ではない
**更新日:** 2026-07-26
**正本への入口:** [PROJECT_STATE.md](../PROJECT_STATE.md)、[strategy](character-architecture-strategy.md)、[governance](architecture-governance.md)、[ADR-001](adr/001-next-character-comparison-boundaries.md)
**作業の分割:** [docs/packets/](packets/README.md) — 各カードを実装セッションが単独実行できる単位へ分割したもの

このボードは、次期キャラクター表現改善の実行状態を一目で追うための
運用artifactである。方式の採択、恒久契約への昇格、外部取得、依存追加、
クラウド利用を承認するものではない。各カードの `STOP` が成立した時点で、
Forge は作業を止め、Orbit が必要な判断をまとめて mi3san に提示する。

## 凡例

| 状態 | 意味 | 次に動く人 |
| --- | --- | --- |
| `DONE` | 受入証拠が main にある | Orbit が後続依存を解放する |
| `READY` | 承認済み範囲内で Forge が開始できる | Forge |
| `IN_PROGRESS` | Forge が task packet 内で実行中 | Forge / Orbit |
| `BLOCKED_OWNER` | mi3san の明示判断・承認が必要 | Orbit が一括判断を提示する |
| `GATED` | 前stageの受入または owner decision 前。開始しない | Orbit が gate を監視する |
| `CONDITIONAL` | 条件が成立した場合だけ作る。条件外では実行しない | Orbit |

## ボード全景

| DONE | READY | IN_PROGRESS（提出済み・merge待ち） | BLOCKED_OWNER | GATED / CONDITIONAL |
| --- | --- | --- | --- | --- |
| P0a-01 fixed baseline evidence | K-01 board state refresh | M3-06 D native asset / rig — PR #35 | M2-01 N0 disposition / reopening package | M0-05 approved temporary-resource deletion |
| M0-01 project state correction |  | M3-08 E native asset / rig — PR #36 | M3-14 P1 render network enforcement | M1-04–M1-06 P0b artifact binding |
| M0-02 temporary-resource reference check |  | M3-10 B1 transition boundary — PR #32 | M3-13 candidate retention | M2-02–M2-05 conditional N0 spike |
| M0-03 merged-branch cleanup check |  | M3-11 B2 quality ceiling — PR #31 | M6-00 P4 entry approval | M3-02, M3-05, M3-07, M3-09 P1 renders |
| M0-04 PR #18 disposition record |  | M3-14 evidence recorder — PR #33 | M7-01 final representation selection | M3-12 capability matrix |
| M0-06 PR #18 unmerged close |  | 遮蔽証拠コントラクト — PR #37 |  | M4-00–M4-08 P2 styled comparison |
| M1-01 P0b contract |  | AP-009 mojibake修復 — PR #34 |  | M5-00–M5-05 P3 production slice |
| M1-02 interval/conformance correction |  | task packet分割 — PR #38 |  | M6-01–M6-06 neural enhancement |
| M3-04 C native asset（PR #30 merged） |  | 本ボード更新 — PR #39 |  | M7-00, M7-02–M7-05 decision/migration |
| M2-00 local neural inventory |  |  |  | M7-00, M7-02–M7-05 decision/migration |
| M3-00 P1 Track A run definition |  |  |  | M8-00–M8-04 closure |
| M3-01 Blender 4.5 LTS provision |  |  |  |  |
| M3-03 Track A ceiling approved |  |  |  |  |
| M3-04 C native asset |  |  |  |  |

## 完了済み（再実行しない）

| ID | 成果 | 受入証拠 | 依存を解放するもの |
| --- | --- | --- | --- |
| P0a-01 | 現行方式Aの再現可能な証跡vertical slice | PR #19、619-frame normal artifact、conformance/evaluation/review/negative test | P0bが既存baselineを参照できる |
| M0-01 | プログラムの現在地をP0a完了・Goal未達へ修正 | PR #20、`PROJECT_STATE.md` | P0b以降を独立stageとして管理できる |
| M1-01 | P0b比較契約の最小実装 | PR #20、`pipeline/p0b/comparison-contract.ts` | 比較artifactの共通メタデータを検証できる |
| M1-02 | time intervalとconformance意味の修正 | PR #20、33 tests | `[0, 619)` と品質非同一性を固定 |
| M2-00 | N0 local-only inventory | PR #21、`out/n0/local-inventory.json` | localにneural model/weights/datasetが無いことを証拠化 |
| M0-02 | P0用一時resourceの参照確認 | PR #24、`main` `4b9b030` 時点の監査結果。Firewall ruleは現host・tracked sourceに無し、`out/p0` は保持 | M0-05の削除候補と保持理由が分離される |
| M0-03 | merge済みfeature branchの削除可否判定 | PR #24、`keep` / `safe-to-delete` 区分。owner worktreeと未push commitは `keep` | M8-02のbranch整理を証拠付きで判断できる |
| M0-04 | PR #18を `SUPERSEDED` としてunmerged closeする方針の記録 | PR #26、[PR #18 comment](https://github.com/wit-maker/neko-tera-video/pull/18#issuecomment-5068173058) | M0-06を解放する |
| M0-06 | PR #18のunmerged close実行 | PR #26、PR #18 closed。Markdown移植・複製なし、remote branchは保持 | Vault streamをこのprogramのcritical pathから外す |
| M3-00 | P1 Track A run definitionの固定 | PR #25、`pipeline/m3/p1-track-a-run-definition.json`、`npm run m3:validate-p1-run-definition`、`npm test`（8 files / 42 tests pass） | M3-03承認後にP1 native asset / renderカードを解放できる |
| M3-01 | Blender 4.5 LTS portable tool provision | PR #23、`pipeline/m3/blender-tool-receipt.json`、archive SHA-256 `2EE75E9466D293A784FDF020F60FE1309C1E0610ECF73C64F1FC09B01E5EEC56`、`out/tools/blender-4.5-lts-win-x64/` | D/E native asset作業のtool前提を満たす |
| M3-03 | P1 Track A固定制作上限のowner承認（合計40人時） | mi3sanの明示承認（2026-07-25）。`pipeline/m3/p1-track-a-run-definition.json` の `status: OWNER_APPROVED` と `ownerApproval`、validator、`npm test`（8 files / 46 tests pass） | native assetカード `M3-04` / `M3-06` / `M3-08` / `M3-10` / `M3-11` を解放する |
| M3-04 | C native 2D parametric mesh asset | `pipeline/m3/c/`、`npm run m3:validate-c-asset`、`npx vitest run pipeline/m3/c`（18 tests pass）、`pipeline/m3/c/effort-log.json`、AP-010 / AP-011 | `M3-05`（C render）が `M3-14` 成立後に着手できる。`M1-04` のC Character Bible instanceの入力になる |

## 今すぐ実行可能なカード

| ID | 目的（最小単位） | Owner / 実行者 | 入力・依存 | 成果物・受入条件 | STOP |
| --- | --- | --- | --- | --- | --- |
| K-01 | このボードのカード状態をstage受入・停止・owner decisionごとに更新する | Orbit | stage cardの受入証拠または停止証拠 | card ID、状態、根拠commit/PR、次の責任者が一致 | 根拠なしに `DONE` / `READY` へ移さない |

Forgeが承認済み範囲内で新規に開始できるカードは、現時点で無い。P1 native assetは
5枚とも提出済みでmerge待ちであり、それ以降は全て owner の判断・作業を待っている。

## 提出済み・merge待ち

merge されるまで `DONE` へは移さない。ボード規則どおり、受入証拠が `main` にある
ものだけが `DONE` である。

| ID | 成果 | PR | merge後に解放されるもの |
| --- | --- | --- | --- |
| M3-06 | D native 2.5D anatomical asset / rig | [#35](https://github.com/wit-maker/neko-tera-video/pull/35) | `M3-07`（`M3-14` 成立後）、`M1-04` のD instance |
| M3-08 | E native full-3D asset / rig | [#36](https://github.com/wit-maker/neko-tera-video/pull/36) | `M3-09`（`M3-14` 成立後）、`M1-04` のE instance。**base が #35。#35 を先にmergeする** |
| M3-10 | B1 state数・遷移境界の実測 | [#32](https://github.com/wit-maker/neko-tera-video/pull/32) | `M3-12` のB1入力 |
| M3-11 | B2 keyframed vector 品質上限 | [#31](https://github.com/wit-maker/neko-tera-video/pull/31) | `M3-12` のB2入力 |
| M3-14 | enforcement証跡recorder（**rule適用はしない**） | [#33](https://github.com/wit-maker/neko-tera-video/pull/33) | mi3sanのrule適用後、`npm run m3:record-network-enforcement` で証跡を記録できる |
| — | 方式横断の遮蔽証拠コントラクト（AP-010/012/013の受入条件化） | [#37](https://github.com/wit-maker/neko-tera-video/pull/37) | `M3-12` が方式を同じ厳しさで比較できる |
| — | AP-009エントリの文字化け修復 | [#34](https://github.com/wit-maker/neko-tera-video/pull/34) | 台帳のラベル集合が機械的に検査される |
| — | task packetへの分割（W0〜W8） | [#38](https://github.com/wit-maker/neko-tera-video/pull/38) | 実装セッションが packet 単位で着手できる |
| K-01 | 本ボード更新と判断待ちの集約 | [#39](https://github.com/wit-maker/neko-tera-video/pull/39) | 盤面が実態と一致する |

## mi3san 判断待ちカード

| ID | mi3san に判断してもらうこと | 誰が・どこで・どのように実行するか | 承認後の最小成果 | STOP / 非対象 |
| --- | --- | --- | --- | --- |
| K-02 | agentが制作した作業をTrack Aのコスト軸へどう計上するか | `M3-03` の上限は人間operatorの人時で固定されている。C/D/E/B1/B2 の5つのeffort logはすべて `operatorHours: null` であり、数値を捏造するとコスト軸が壊れるため空にしてある。mi3san が計上方法を決める | Track Aのコスト軸が比較可能になる。`M3-12` と `M3-13` の前に必要 | 推測値の代入、方式ごとに異なる基準の適用 |
| K-03 | 欠陥修正を `nativeAssetRevisionsMax` に計上するか | 方式Cの `nativeAssetVersions` が **3 / 承認上限2**。version 2 が承認済み制御範囲の内側で自己交差する輪郭を生成しており、既知の不正形状を比較用assetに残すほうがP1証跡を汚すと判断して修正した（PR #30に開示）。外見・品質・スタイルの変更はしていない | 計上する場合はCへ明示的な追加承認。しない場合はCが 2/2 で品質反復の余地なし | 上限超過を黙って吸収する |
| M2-01 | N0を現在cycleで local-only no-go として閉じるか、再開する特定model packageを承認するか | Orbit が candidate、取得元、license、weights/data、外部送信、local代替、8GB停止条件を一件の承認要求で提示。mi3san が明示承認する | no-go記録、またはM2-02だけを解放 | 無名の「neuralを試す」、cloud、paid、未承認取得は開始しない |
| M3-14 | P1 render前のlocal outbound-block / loopback-only enforcementを再構成する | mi3sanがhost側でruleを適用し、Forgeは適用後の証跡だけを記録する。agentはfirewall ruleを変更しない（`m300ExecutionProhibitions` の `firewall-rule-change`） | render系カード（M3-02/05/07/09）を解放するenforcement証跡 | 証跡なしのrender、agentによるsecurity設定変更は不可 |
| M3-13 | P1後、P2へ残すBase候補を決める | Orbitが実artifactをnormal/slow/crop/debug/stillと軸別evidenceで提示し、mi3sanがretain/dropを決定 | M4-00を解放するcandidate set | conformance pass、未承認weighted score、推測だけで採択しない |
| M6-00 | N0 pass後にP4 neural enhancementを比較へ入れるか | OrbitがN0実測・license・determinism・drift・local computeを一括提示し、mi3sanが承認 | M6-01を解放するBase × Enhancement組 | N0 no-goならM6全体をclose |
| M7-01 | 最終representationを選定する、またはevidence付きno-goにする | Orbitが軸別artifact/evidenceを提示し、mi3sanが実映像比較で決定 | ADR更新とM7-02以降を解放 | 未合意の重み付き総合点、agentの自動採択は不可 |

## M0 — Program control

| ID | 状態 | 最小task | 依存 | 受入条件 | 停止条件 | 担当 |
| --- | --- | --- | --- | --- | --- | --- |
| M0-02 | DONE | P0 temporary resourceの参照確認（`main` `4b9b030`） | P0a-01 | Firewall ruleは現host・tracked sourceに無し。normal/quarantine `out/p0` は保持期限未決のため削除しない | 正常参照あり | Forge, Orbit |
| M0-03 | DONE | merge済みbranch削除可否の確認（`main` `4b9b030`） | M0-02 | merged refsの削除候補と、owner worktree/未統合refsの保持対象を分離 | owner worktree / 未統合commit | Forge, Orbit |
| M0-04 | DONE | PR #18を `SUPERSEDED` としてunmerged closeする方針を記録 | owner directive | [PR #18 comment](https://github.com/wit-maker/neko-tera-video/pull/18#issuecomment-5068173058) とclose状態。remote branchはVault provenance確認まで保持 | Vault scopeへ侵入 | Orbit, mi3san |
| M0-05 | GATED | 承認済みtemporary resourceだけを安全に削除 | M0-02, M0-03 | 対象を解決し、削除後もreproduction/PR参照が成立 | 参照・owner work・復旧不能性 | Forge, Orbit |
| M0-06 | DONE | PR #18方針を実行してunmerged closeする | M0-04 | `SUPERSEDED` コメント後にPRをclose。Markdown移植/複製なし、remote branch保持 | Vault scopeへ侵入 | Orbit |

## M1 — P0b comparison contractの実artifact接続

| ID | 状態 | 最小task | 依存 | 受入条件 | 停止条件 | 担当 |
| --- | --- | --- | --- | --- | --- | --- |
| M1-04 | GATED | P1で実在する各native assetからCharacter Bible instanceを一件ずつ作る | M3 native assets | identity / intent / observable / adapter control が方式別に分離 | 同じcompleted PNG/topology/bonesを強制する要求 | Forge |
| M1-05 | GATED | 各P1 artifactをP0b schemaへ登録する | M1-04, M3 renders | provenance/hash/timebase/color/alpha/camera/crop/effort/known failureが埋まる | 実測不能な値、正常とinvalidの混同 | Forge |
| M1-06 | GATED | normal/slow/crop/debug/still comparison presentationを生成する | M1-05 | invalidを隔離し、conformance/evaluationを別表示 | conformanceを品質合格/採択として表示 | Forge |

## M2 — N0 neural feasibility（順位外）

| ID | 状態 | 最小task | 依存 | 受入条件 | 停止条件 | 担当 |
| --- | --- | --- | --- | --- | --- | --- |
| M2-01 | BLOCKED_OWNER | local-only no-goをcloseする、または特定candidate packageを承認する | M2-00 | one of: no-go decision / approved package | package未特定、承認なし | Orbit, mi3san |
| M2-02 | CONDITIONAL | 承認済みmodel/weights/data/licenseを取得しcanonical identityを記録する | M2-01 approval | source, hash, license, allowed use, storageが固定 | license/hash/source/terms不一致 | Forge |
| M2-03 | CONDITIONAL | isolated local runtimeを構成する | M2-02 | no cloud/paid、8GB local execution path、repro command | new dependency/toolの追加承認なし | Forge |
| M2-04 | CONDITIONAL | low-resolution deterministic feasibility runを実測する | M2-03 | VRAM/time/seed/output hash/identity and temporal drift evidence | OOM、external traffic、license breach | Forge |
| M2-05 | CONDITIONAL | N0 pass/no-go packetを作る（順位付けなし） | M2-04 | P4へ残す価値だけを明示、Base順位なし | evidence不足 | Orbit |

## M3 — P1 mechanism evidence

P1の中心比較は **A / C / D / E**。B1はstate増加・transition境界、B2は2D品質上限対照としてのみ扱う。全taskは pre-render、yaw `±15°`、pitch `±10°` の採択済み範囲内で実行する。

| ID | 状態 | 最小task | 依存 | 受入条件 | 停止条件 | 担当 |
| --- | --- | --- | --- | --- | --- | --- |
| M3-00 | DONE | P1 performance sequence、observables、camera、A/B track budgetを一つのrun definitionへ固定 | なし（budget承認は `M3-03`） | `pipeline/m3/p1-track-a-run-definition.json` とvalidatorで、Track A候補/sequence/view/budget/pre-render network preconditionを固定。M3-00自身はrender/native assetを実行しない | fixed scopeの変更、network precondition欠落、Track B混入 | Orbit, Forge |
| M3-01 | DONE | Blender 4.5 LTS portable tool provision | mi3san explicit approval | official source, SHA, license, storage, headless local check are recorded in `pipeline/m3/blender-tool-receipt.json` | network/add-on/admin/8GB failure | Forge |
| M3-03 | DONE | P1 Track Aの固定制作上限をmi3sanが承認する | M3-00 | mi3sanの明示承認（2026-07-25）。A/C/D/E各8人時・asset revision 2・final render 2、B1/B2各4人時・revision 1・render 1、合計40人時。`status: OWNER_APPROVED` と `ownerApproval` をvalidator/testで固定 | 上限超過、Track B到達品質のTrack Aへの混入 | Orbit, mi3san |
| M3-14 | BLOCKED_OWNER | P1 render前のlocal outbound-block / loopback-only enforcementを再構成する | M0-02（現hostにP0のfirewall ruleは不在） | 適用後のenforcement証跡が `renderNetworkPrecondition.acceptedEvidence` を満たす | agentによるfirewall rule変更、証跡なしのrender | mi3san, Forge |
| M3-02 | GATED | A adapterのP1 sequenceをrenderし、P0aとの差分をprovenanceで明示 | M3-00, M3-03, M3-14 | native A artifact、hash、known failures、P0b record | P0a baselineを無根拠に品質比較へ転用 | Forge |
| M3-04 | DONE | C native 2D parametric mesh assetを作る | M3-00, M3-03 | `pipeline/m3/c/`。layer/control cage/deformer/mask/draw orderを方式C固有に定義。外部asset入力0件、shared PNG/topology/bonesなし。閉口時の口腔遮蔽と開口時の露出を対で検証。`npm run m3:validate-c-asset` と18 testsが受入証跡 | new dependency/external asset が必要 | Forge |
| M3-05 | GATED | C adapterをrender・全frame検証する | M3-04, M3-14 | normal/slow/crop/debug/still inputsとcapability evidence | decode/timebase failure | Forge |
| M3-06 | READY | D native 2.5D anatomical asset/rigを作る | M3-00, M3-01, M3-03 | jaw/lips/corners/muzzle/cheek/oral cavity/occlusion controlsを持つ | Blender provision/8GB/headless failure | Forge |
| M3-07 | GATED | D adapterをrender・全frame検証する | M3-06, M3-14 | P0b recordとcapability evidence | decode/timebase failure | Forge |
| M3-08 | READY | E native full-3D asset/rigを作る | M3-00, M3-01, M3-03 | E固有controlsとcamera/view behaviorをasset側で表現 | Blender provision/8GB/headless failure | Forge |
| M3-09 | GATED | E adapterをrender・全frame検証する | M3-08, M3-14 | P0b recordとcapability evidence | decode/timebase failure | Forge |
| M3-10 | READY | B1 state-count/transition boundary artifactを作る | M3-00, M3-03 | supported/approximated/unsupportedを明示 | B1を中心品質順位へ混入 | Forge |
| M3-11 | READY | B2 hand/vector 2D quality-ceiling artifactを作る | M3-00, M3-03 | native hand/vector制作条件と上限を記録 | B2をA/C/D/Eと同一mechanismと誤表記 | Forge |
| M3-12 | GATED | capability matrix、Track A evidence、Track B cycle logを作る | M3-02, M3-05, M3-07, M3-09, M3-10, M3-11 | native/approximated/unsupported/artist-authored、effort、failure、cycle stop reasonを方式別に表示 | Track A/B混同、品質総合点化 | Forge, Orbit |
| M3-13 | BLOCKED_OWNER | P1 comparison packをmi3sanへ提示しP2候補をretain/dropする | M1-06, M3-12 | real artifactのnormal/slow/crop/debug/still、軸別evidence | artifact不足、owner decisionなし | Orbit, mi3san |

## M4 — P2 styled comparison

| ID | 状態 | 最小task | 依存 | 受入条件 | 停止条件 | 担当 |
| --- | --- | --- | --- | --- | --- | --- |
| M4-00 | GATED | P2 retained Base setとTrack A ceilingを固定する | M3-13 | mi3sanのretain/dropとbudgetが明記 | candidate/budget未決 | Orbit, mi3san |
| M4-01 | GATED | retained Baseごとのstyled native asset briefを固定する | M4-00, M1-04 | identity/silhouette/fur/color/oral cavityを満たす方式別brief | shared completed PNG/topology強制 | Orbit, Forge |
| M4-02 | GATED | retained BaseごとにTrack A native assetを制作する | M4-01 | effort log、license、native control、known failure | budget超過・外部取得 | Forge |
| M4-03 | GATED | retained BaseごとにTrack A renderと全frame検証を行う | M4-02 | normal/slow/crop/debug/still sourceが揃う | decode/repro failure | Forge |
| M4-04 | GATED | retained BaseごとのTrack A conformance/evaluationを分離する | M4-03 | conformanceと評価の別artifact、invalid隔離 | passを品質合格と表示 | Forge |
| M4-05 | GATED | Track B cycle 1を、target failureと追加人時を固定して実行する | M4-04 | before/after、cost、改善、継続/停止理由 | fixed targetなし、Track Aへの混入 | Forge |
| M4-06 | GATED | Track Bの次cycle可否をfailure飽和で判定する | M4-05 | cycle継続またはstopの証拠 | 追加投入の根拠なし | Orbit |
| M4-07 | GATED | P2 comparison presentationを生成する | M4-04, M4-06 | normal/slow/crop/debug/still/final composite、invalid隔離 | missing artifact | Forge |
| M4-08 | GATED | P3へ進める候補をmi3sanが選ぶ | M4-07 | retain/drop decision | owner decisionなし | Orbit, mi3san |

## M5 — P3 production slice

| ID | 状態 | 最小task | 依存 | 受入条件 | 停止条件 | 担当 |
| --- | --- | --- | --- | --- | --- | --- |
| M5-00 | GATED | production候補と6–10秒台詞intentを固定する | M4-08 | candidate set、script、camera、output contract | candidate/intent未決 | Orbit, mi3san |
| M5-01 | GATED | candidateごとにears/eyes/whiskers/breath/staging/cameraをnative assetへ拡張する | M5-00 | asset revisionと変更手順 | scopeが新方式研究へ拡大 | Forge |
| M5-02 | GATED | candidateごとにproduction sliceをrenderする | M5-01 | final Remotion presentation、all-frame decode、provenance | render/repro failure | Forge |
| M5-03 | GATED | 一回の修正cost、rerender、compute、asset修正手順を実測する | M5-02 | repeatable measurement log | 推測値のみ | Forge |
| M5-04 | GATED | P3 review packを生成する | M5-02, M5-03 | quality/cost/compute/repro/operation/licenseを別軸表示 | weighted total score | Orbit, Forge |
| M5-05 | GATED | final-selection候補をmi3sanへ提示する | M5-04 | M7-01へ渡す候補と未解決failure | 実artifactなし | Orbit, mi3san |

## M6 — P4 neural enhancement（条件付き）

| ID | 状態 | 最小task | 依存 | 受入条件 | 停止条件 | 担当 |
| --- | --- | --- | --- | --- | --- | --- |
| M6-00 | BLOCKED_OWNER | N0 passかつP4実施の明示承認を取得する | M2-05, owner approval | approved Base × X2/X3 scope | N0 no-go / approvalなし | Orbit, mi3san |
| M6-01 | CONDITIONAL | approved model/weights/data/licenseを固定する | M6-00 | source/hash/license/allowed useを記録 | external/license approvalなし | Forge |
| M6-02 | CONDITIONAL | X2 neural redrawを対象Baseと組にして実行する | M6-01 | deterministic fallback、seed/run evidence | drift/OOM/network | Forge |
| M6-03 | CONDITIONAL | X3 neural residualを対象Baseと組にして実行する | M6-01 | deterministic fallback、seed/run evidence | drift/OOM/network | Forge |
| M6-04 | CONDITIONAL | identity/temporal driftと復旧手順を評価する | M6-02, M6-03 | BaseとEnhancementを別軸で示す | Baseとの混同 | Forge, Orbit |
| M6-05 | CONDITIONAL | P4 comparison packとno-go/pass packetを提示する | M6-04 | P2/P3との比較公平性を保持 | evidence不足 | Orbit |
| M6-06 | CONDITIONAL | P4をfinal decision inputへ接続するか閉じる | M6-05 | owner decisionまたはevidence付きclose | owner decisionなし | Orbit, mi3san |

## M7 — final decision / production migration

| ID | 状態 | 最小task | 依存 | 受入条件 | 停止条件 | 担当 |
| --- | --- | --- | --- | --- | --- | --- |
| M7-00 | GATED | 全候補のartifact/evidenceを軸別decision packetへ集約する | M5-05, M6-06 if run | visual/cost/compute/repro/operation/license/failureが別表示 | weighted total score | Orbit |
| M7-01 | BLOCKED_OWNER | final representation selectionまたはno-goを決定する | M7-00 | mi3sanの明示決定 | real artifactなし | mi3san |
| M7-02 | GATED | final decisionをADRへ記録する | M7-01 | decision、根拠artifact、scope、未解決リスク | owner decision不在 | Orbit |
| M7-03 | GATED | selected representationをproduction integrationへ実装する | M7-02 | adapter/native asset/render/validator/operationのvertical slice | new architecture exception | Forge |
| M7-04 | GATED | production migrationを再現・運用検証する | M7-03 | source/tool/version/hash、rerender、rollbackが検証済み | repro/operation failure | Forge, Orbit |
| M7-05 | GATED | no-goなら構造上限と必要なarchitecture changeをevidence付きで記録しAtlas再招集可否を判定する | M7-01 no-go | evidence-based no-go | 基本分類/公平性/長期投資の抜本変更が必要 | Orbit |

## M8 — closure

| ID | 状態 | 最小task | 依存 | 受入条件 | 停止条件 | 担当 |
| --- | --- | --- | --- | --- | --- | --- |
| M8-00 | GATED | final artifact registryを確定する | M7-04 or M7-05 | artifact/source commit/tool version/hash/license/measurement/decisionが追跡可能 | evidence欠損 | Forge, Orbit |
| M8-01 | GATED | `PROJECT_STATE.md`をprogram完了状態へ更新する | M8-00 | selected migrationまたはno-goが正確に記録 | decision未確定 | Orbit |
| M8-02 | GATED | obsolete temporary branches/artifacts/firewall rulesを参照確認後に削除する | M8-00, M0-05 | 残す証拠と消す一時物が分離 | owner work/normal references | Forge, Orbit |
| M8-03 | GATED | 観測済み再発だけをtest/validator/acceptanceへ戻す | M8-00 | 文書だけでなく機械的防止がある | 将来リスク・一般論の追記 | Forge, Orbit |
| M8-04 | GATED | Vaultへ送る候補を列挙するだけに留め、programを閉じる | M8-01, M8-03 | Vault生成/同期なしでclose reportが完成 | Vault scopeへ侵入 | Orbit |

## 次の解放順序

0. **現在Forgeが新規に開始できるカードは無い。** P1 native assetは5枚とも提出済みでmerge待ちであり、以降は全て owner の判断・作業を待つ。critical pathを進めるのは、PR merge、`M3-14` のrule適用、`K-02`/`K-03`/`M3-13` の判断である。
1. M0のうち `M0-02`、`M0-03`、`M0-04`、`M0-06` は受入済み。`M0-05` は削除承認または保存期限の決定まで解放しない。
2. Orbit は `M2-01`、`M3-14` の判断packetを、必要な時だけ一件ずつmi3sanへ出す。`M3-01` はPR #23で、`M0-04/M0-06` はPR #18 closeで、`M3-00` はPR #25で、`M3-03` はmi3sanの2026-07-25承認で受入済みである。
3. `M3-03` 承認により、native assetカード `M3-04` / `M3-06` / `M3-08` / `M3-10` / `M3-11` を解放する。上限は候補ごとに固定であり、超過した時点で停止して報告する。
4. renderカード `M3-02` / `M3-05` / `M3-07` / `M3-09` は `M3-14` のenforcement証跡が揃うまで解放しない。`M3-03` の承認はrender実行を承認していない。
5. P1の実映像をmi3sanが比較して `M3-13` を決めるまで、P2以降は開始しない。
6. N0は順位外であり、`M2-05` がpassになってもP4を自動開始しない。`M6-00` の明示承認が別途必要である。

## 更新規則

- `DONE` へ移すには、commit/PR、artifact、検証command、結果、保存場所のいずれかではなく**全て**の受入証拠をカードへリンクする。
- `BLOCKED_OWNER` には、mi3sanが決める対象、承認する実行者、取得/実行場所、手順、送信data、費用、代替、停止条件を一つのpacketにして提示する。
- `GATED` を `READY` にするのは、依存カードが受入済みで、外部取得・新規dependency・cloud/paid・license・不可逆操作の承認が揃った場合だけである。
- 結果が正常artifactでない場合は `invalid` / `not-evaluated` / `known-failure` として隔離し、通常比較や候補retain判断へ混入させない。
