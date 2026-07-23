import { z } from "zod";

// video.json = SSOT。すべての派生物(音声・タイミング・字幕・レイヤー構成)はここから生成する。

export const SpeakerId = z.enum(["sensei", "mike"]);
export type SpeakerId = z.infer<typeof SpeakerId>;

export const Emotion = z.enum([
  "calm", // 穏やか・淡々
  "assertive", // 断定・確信
  "gentle", // 優しい・温かい
  "curious", // 問いかけ・素朴な疑問
  "confused", // 困惑・戸惑い
  "surprised", // 驚き
  "discovery", // 発見・気づき
  "earnest", // 真剣・切実
  "murmur", // つぶやき・かみしめる
]);
export type Emotion = z.infer<typeof Emotion>;

export const DialogueLine = z.object({
  id: z.string(), // 例: "s1c2-01" — 音声/アラインメントのファイル名に対応
  speaker: SpeakerId,
  text: z.string(), // 表示・TTS共通の本文
  ttsText: z.string().optional(), // 読み違い対策の読み上げ専用表記(未指定ならtext)
  emotion: Emotion,
  speed: z.number().min(0.5).max(1.5).default(1.0),
  pauseAfterSec: z.number().min(0).max(3).default(0.4),
});
export type DialogueLine = z.infer<typeof DialogueLine>;

export const CameraShot = z.enum(["wide", "medium", "closeup", "board", "insert"]);

export const Camera = z.object({
  shot: CameraShot,
  // 2.5Dパララックス: 深度マップに基づくカメラ移動。値は画面幅比(0.0-0.1程度)
  parallax: z
    .object({
      panX: z.number().default(0),
      panY: z.number().default(0),
      zoom: z.number().default(0), // 正=寄る, 負=引く(カット内の変化量)
      strength: z.number().min(0).max(1).default(0.5), // 深度差の強さ
    })
    .default({ panX: 0, panY: 0, zoom: 0, strength: 0.5 }),
  dof: z.number().min(0).max(1).default(0), // 被写界深度ボケの強さ
  easing: z.enum(["linear", "inOut", "out"]).default("inOut"),
});
export type Camera = z.infer<typeof Camera>;

// 黒板: 幾何図形(プログラマティックSVG・チョーク質感)+フォント文字のみ。
// 複雑なイラストのAI手描きSVGは禁止(プラン制約)。
export const BoardElement = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("circle"),
    id: z.string(),
    cx: z.number(),
    cy: z.number(),
    r: z.number(),
  }),
  z.object({
    kind: z.literal("arrow"),
    id: z.string(),
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    doubleHead: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("line"),
    id: z.string(),
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
  }),
  z.object({
    kind: z.literal("label"),
    id: z.string(),
    x: z.number(),
    y: z.number(),
    text: z.string(),
    size: z.number().default(48),
    emphasis: z.boolean().default(false),
  }),
  z.object({
    // 黒板消し: targets のidの要素をフェードアウトさせる(以降のカットでも消えたまま)
    kind: z.literal("erase"),
    id: z.string(),
    targets: z.array(z.string()),
  }),
]);
export type BoardElement = z.infer<typeof BoardElement>;

export const BoardAction = z.object({
  element: BoardElement,
  // 描き始めのトリガー: セリフ行IDと、その行の頭からのオフセット秒
  atLineId: z.string().optional(),
  offsetSec: z.number().default(0),
  drawDurationSec: z.number().default(0.8),
});

export const CharacterPose = z.enum([
  "stand", // 通常立ち
  "point", // 黒板を指す
  "think", // 考える
  "tea", // 湯のみ/急須
  "tablet", // タブレット
]);

export const CharLayer = z.object({
  speaker: SpeakerId,
  pose: CharacterPose,
  position: z.enum(["left", "right", "center"]),
  scale: z.number().default(1),
  visible: z.boolean().default(true),
});

export const SubtitleSpec = z.object({
  // Subtitle Agentが決定: 改行位置は本文に\nで埋め込み、強調語・ルビを指定
  lines: z.array(
    z.object({
      lineId: z.string(), // DialogueLine.id
      displayText: z.string(), // 改行済み表示テキスト
      emphasis: z.array(z.string()).default([]), // 強調する語
      ruby: z.array(z.object({ base: z.string(), ruby: z.string() })).default([]),
    })
  ),
});

export const SoundSpec = z.object({
  bgmCue: z.enum(["none", "main-soft", "main-warm", "outro"]).default("none"),
  ambience: z.enum(["none", "garden-day", "garden-evening"]).default("garden-day"),
  sfx: z
    .array(
      z.object({
        file: z.string(), // public/sfx/ 内のファイル名
        atSec: z.number(), // カット頭からの秒
        gainDb: z.number().default(0),
        durationSec: z.number().optional(), // 指定時はこの長さにトリム(フェードアウト付き)
      })
    )
    .default([]),
});

export const Cut = z.object({
  id: z.string(), // 例: "s1c2"
  title: z.string(), // 演出メモ(人間可読)
  dialogue: z.array(DialogueLine).default([]),
  fixedDurationSec: z.number().optional(), // 無音カット用の固定尺
  camera: Camera,
  bg: z.string(), // public/assets/bg/ のファイル名(placeholder時は "placeholder")
  chars: z.array(CharLayer).default([]),
  fgLayers: z.array(z.string()).default([]), // 前景(湯気・木漏れ日等)のアセット名
  board: z.object({ visible: z.boolean(), actions: z.array(BoardAction) }).optional(),
  subtitle: SubtitleSpec.optional(),
  sound: SoundSpec.default({ bgmCue: "none", ambience: "garden-day", sfx: [] }),
});
export type Cut = z.infer<typeof Cut>;

export const Scene = z.object({
  id: z.string(), // "s1".."s7"
  title: z.string(),
  cuts: z.array(Cut),
});
export type Scene = z.infer<typeof Scene>;

export const VideoProject = z.object({
  meta: z.object({
    title: z.string(),
    width: z.literal(1080),
    height: z.literal(1920),
    fps: z.literal(60),
    fontBoard: z.string().default("Yusei Magic"),
    fontSubtitle: z.string().default("Klee One"),
    speakerColors: z.record(SpeakerId, z.string()),
  }),
  voices: z.record(
    SpeakerId,
    z.object({
      referenceId: z.string(), // Fish Audio reference_id(選定後に記入)
      label: z.string(),
    })
  ),
  scenes: z.array(Scene),
});
export type VideoProject = z.infer<typeof VideoProject>;

// カット尺の規則: セリフあり = Σ(音声実測尺 + pauseAfterSec) + 前後パディング
export const CUT_PADDING_HEAD_SEC = 0.35;
export const CUT_PADDING_TAIL_SEC = 0.55;
