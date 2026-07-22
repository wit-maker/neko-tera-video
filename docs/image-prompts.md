# 素材生成手順書(image-prompts.md)

AI画像生成で用意してもらう素材の一覧・プロンプト・配置先。
生成後はパイプライン(rembg切り抜き → Real-ESRGAN → Depth Anything V2)で加工するので、
**ここでは「生成して所定のフォルダに置く」ところまで**をお願いします。

## 全体ルール

- **画像内に日本語の文字を入れない**(黒板の文字・図はすべてプログラム側でフォント/SVG描画する。画像AIは日本語文字が崩れるため)
- 生成サイズは長辺2048px以上を推奨(アップスケールで仕上げる)
- 画風は全素材で統一: **和風水彩+セルアニメ調、柔らかい輪郭線、温かい色調**(スタイル指定文を全プロンプトに共通で付ける)
- キャラクター素材は**単体・全身・無地背景**(切り抜き精度のため。薄いグレー単色背景が最適)
- 同一キャラの差分は、できるだけ**同じ生成条件(シード・参照画像)から派生**させて統一感を保つ

共通スタイル指定(全プロンプト末尾に付与):

```
japanese watercolor + cel anime style, soft outlines, warm gentle colors,
storybook illustration, no text, no letters, no watermark
```

---

## 1. キャラクター(配置先: `public/assets/chars/`)

### にゃんこ先生(老齢の賢者猫)

外見の固定設定(全差分で共通に書く):
「灰白色の毛並みの年配の猫、たれ目で穏やか、小さめの丸眼鏡、藍色の作務衣、長い眉毛」

| ファイル名 | ポーズ | プロンプト骨子 |
|---|---|---|
| `sensei-stand.png` | 立ち(正面やや斜め) | elderly wise gray-white cat, round glasses, indigo samue robe, standing calmly, front 3/4 view, full body, plain light gray background |
| `sensei-point.png` | 黒板を指す | same cat, right arm raised pointing to the side (toward a blackboard), holding chalk, full body, plain light gray background |
| `sensei-tea.png` | 湯のみ/急須 | same cat, sitting, holding a small teacup with both paws, relaxed, full body, plain light gray background |

### ミケ(若い三毛猫の弟子)

外見の固定設定:
「若い三毛猫(白・茶・黒)、大きな丸い目、好奇心の強い表情、若草色の甚平」

| ファイル名 | ポーズ | プロンプト骨子 |
|---|---|---|
| `mike-stand.png` | 立ち | young calico cat, big round eyes, light green jinbei, standing, front 3/4 view, full body, plain light gray background |
| `mike-point.png` | 黒板を指す | same cat, pointing upward to the side with one paw, surprised realization, full body, plain light gray background |
| `mike-think.png` | 考える | same cat, paw on chin, thinking, tilted head, full body, plain light gray background |
| `mike-tablet.png` | タブレット | same cat, sitting, holding a small tablet device with both paws, looking down at it with a troubled face, full body, plain light gray background |

### 口形差分(口パク用) — 各キャラ6種

口パクは「口だけ別画像」を顔に重ねる方式です。ポーズごとに作る必要はなく、
**基準ポーズ(stand)の顔の口部分だけ**を差し替えた画像を6種ずつ用意してください。

作り方(推奨): `*-stand.png` を元に、inpaint(部分修正)で口だけを描き替える。
顔の位置・角度・照明が変わらないことが最重要です。全身が動いてしまう場合は、
顔のクローズアップ(バストアップ)で6種を統一構図で生成しても構いません。

| ファイル名(sensei- / mike- 両方) | 口形 | 指定 |
|---|---|---|
| `*-mouth-closed.png` | 閉口 | mouth closed, gentle |
| `*-mouth-a.png` | あ | mouth wide open (vowel "a") |
| `*-mouth-i.png` | い | mouth open wide horizontally (vowel "i") |
| `*-mouth-u.png` | う | small rounded mouth (vowel "u") |
| `*-mouth-e.png` | え | half-open mouth (vowel "e") |
| `*-mouth-o.png` | お | rounded open mouth (vowel "o") |

### 目パチ差分 — 各キャラ1種

| ファイル名 | 指定 |
|---|---|
| `sensei-eyes-closed.png` / `mike-eyes-closed.png` | 基準ポーズと同構図で目だけ閉じた差分(inpaint推奨) |

---

## 2. 背景(配置先: `public/assets/bg/`)

縦構図(2:3〜9:16)。キャラ・黒板が乗る前提なので、**中央〜下部は要素を少なめ**に。

| ファイル名 | 内容 | プロンプト骨子 |
|---|---|---|
| `study-day.png` | 書斎・昼 | traditional japanese temple study room interior, wooden bookshelves with scrolls, tatami floor, warm sunlight filtering through leaves (komorebi) from a round window, peaceful, vertical composition |
| `study-evening.png` | 書斎・夕方 | same room, late afternoon golden light, longer shadows, slightly orange tone, vertical composition |
| `blackboard.png` | 黒板(無地) | old wooden-framed dark green chalkboard, empty surface, slight chalk dust texture, front view, no writing |

- `blackboard.png` は**完全に無地**で(文字・図はSVG/フォントで上に描画します)
- 昼と夕方は同じ部屋・同じカメラ位置に見えるよう、昼を先に作って img2img で夕方化するのが確実です

---

## 3. 小物・前景(配置先: `public/assets/fx/`)

湯気・木漏れ日・塵はプログラム側でエフェクト描画するため**生成不要**です。
以下のみお願いします:

| ファイル名 | 内容 |
|---|---|
| `teacup.png` | 湯のみ単体(無地背景、切り抜き用) |
| `teapot.png` | 急須単体(無地背景、切り抜き用) |
| `tablet.png` | 小さなタブレット端末単体(画面は消灯・無地) |

---

## 4. 配置後にこちらで実行する処理(参考)

1. `cutout.py` — rembg でキャラ・小物を透過PNG化
2. `upscale.py` — Real-ESRGAN(anime)で全素材をアップスケール
3. `depth.py` — 背景の深度マップ生成(2.5Dパララックス用)→ `public/assets/depth/`

## チェックリスト(納品前確認)

- [ ] 画像内に文字が写り込んでいない
- [ ] キャラ素材は単体・全身・無地背景
- [ ] 口形6種・目閉じ差分が基準ポーズと同じ構図(顔の位置ずれなし)
- [ ] 昼/夕の背景が同じ部屋に見える
- [ ] ファイル名がこの表と一致している
