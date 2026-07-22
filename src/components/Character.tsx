import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import type { Cut, VideoProject } from "../schema";
import type { CutTiming } from "../lib/timing";
import { hashSeed, mulberry32 } from "../lib/chalk";
import { activeLineAt } from "../lib/useAlignments";
import { visemeAt, type Alignment, type Viseme } from "../lib/viseme";
import patchConfig from "../patch-config.json";

type CharLayer = Cut["chars"][number];

// キャラ素材のキャンバス(パッチ座標系)。sensei-pointのみ1344x1792だが高さ基準で表示する。
const SRC_W = 1280;
const SRC_H = 1920;

// 目パチ: 3〜5秒間隔(キャラ+カットのシードで決定的)、6フレームで閉じて開く
const blinkClosedAmount = (frame: number, seed: string, fps: number): number => {
  const rnd = mulberry32(hashSeed(seed));
  let t = (1.5 + rnd() * 2) * fps;
  while (t < frame + fps * 6) {
    const blinkLen = 6;
    if (frame >= t && frame < t + blinkLen) {
      const p = (frame - t) / blinkLen;
      return p < 0.5 ? p * 2 : (1 - p) * 2; // 0→1→0
    }
    if (t > frame) break;
    t += (2.5 + rnd() * 2.5) * fps;
  }
  return 0;
};

/**
 * キャラ1体の描画(本素材)。
 * - ポーズ画像(クロマキー抜き)を表示
 * - standポーズのみ: 口パッチ(viseme)と目閉じパッチ(blink)を重ねる
 *   (口形・目閉じ差分はstandの顔にスケール正規化済み → pipeline/mouthpatch.py)
 * - 右配置のキャラは左右反転して向かい合わせる(素材は右向きで統一)
 */
export const Character: React.FC<{
  project: VideoProject;
  cut: Cut;
  layer: CharLayer;
  timing: CutTiming;
  alignments: Map<string, Alignment>;
}> = ({ project, cut, layer, timing, alignments }) => {
  const frame = useCurrentFrame();
  const fps = project.meta.fps;

  // このキャラが発話中なら口形をアラインメントから決める
  let viseme: Viseme = "closed";
  const active = activeLineAt(timing.lines, timing.durationFrames, frame);
  if (active && active.speaking) {
    const dialogue = cut.dialogue[active.index];
    if (dialogue.speaker === layer.speaker) {
      const alignment = alignments.get(dialogue.id);
      if (alignment) viseme = visemeAt(alignment, active.sinceMs);
    }
  }

  // 呼吸: ゆっくり縦に伸縮(話者はわずかに速く)
  const breathHz = viseme === "closed" ? 0.22 : 0.3;
  const breath = 1 + Math.sin((frame / fps) * Math.PI * 2 * breathHz) * 0.008;

  const blink = blinkClosedAmount(frame, `${layer.speaker}-${cut.id}`, fps);

  const cfg = patchConfig[layer.speaker as keyof typeof patchConfig];
  const poseCfg = (cfg.poses as Record<string, { anchor: number[]; scale: number; imgW: number; imgH: number }>)[
    layer.pose
  ];

  const x = layer.position === "left" ? 60 : layer.position === "right" ? 620 : 340;
  const h = 620 * layer.scale;
  const w = h * ((poseCfg?.imgW ?? SRC_W) / (poseCfg?.imgH ?? SRC_H));
  const s = h / (poseCfg?.imgH ?? SRC_H); // 素材px → 表示px
  const flip = layer.position === "right";

  const isStand = layer.pose === "stand";
  const half = (cfg.mouthCanvas / 2) * (poseCfg?.scale ?? 1);
  const [ax, ay] = poseCfg?.anchor ?? cfg.mouthAnchor;
  const [bx0, by0, bx1, by1] = cfg.blinkBox;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 340,
        left: x,
        width: w,
        height: h,
        transform: `${flip ? "scaleX(-1) " : ""}scaleY(${breath})`,
        transformOrigin: "bottom center",
      }}
    >
      <Img
        src={staticFile(`assets/cutout/chars/${layer.speaker}-${layer.pose}.png`)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {poseCfg ? (
        /* 口パク: ポーズ別アンカーへスケール正規化済みパッチを重ねる */
        <Img
          src={staticFile(`assets/cutout/mouth/${layer.speaker}-${viseme}.png`)}
          style={{
            position: "absolute",
            left: (ax - half) * s,
            top: (ay - half) * s,
            width: half * 2 * s,
            height: half * 2 * s,
          }}
        />
      ) : null}
      {isStand ? (
        /* 目パチ: standのみ。閉じ目パッチをクロスフェード(teaは元絵が閉じ目) */
        <Img
          src={staticFile(`assets/cutout/mouth/${layer.speaker}-blink.png`)}
          style={{
            position: "absolute",
            left: bx0 * s,
            top: by0 * s,
            width: (bx1 - bx0) * s,
            height: (by1 - by0) * s,
            opacity: blink,
          }}
        />
      ) : null}
    </div>
  );
};
