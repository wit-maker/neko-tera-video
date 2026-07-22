import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { Cut, Scene, VideoProject } from "../schema";
import type { CutTiming } from "../lib/timing";
import { useAlignments } from "../lib/useAlignments";
import { ChalkBoard } from "./ChalkBoard";
import { Character } from "./Character";
import { Effects } from "./Effects";
import { Grade } from "./Grade";
import { KaraokeSubtitle } from "./KaraokeSubtitle";
import { Steam } from "./Steam";

// 黒板素材(1920x1280)の盤面領域と、画面上の盤面配置(チョーク描画はこの矩形に入る)
const BOARD_SURFACE = { x0: 428, y0: 262, x1: 1488, y1: 1026 };
const BOARD_RECT = { x: 100, y: 300, w: 880, h: 634 };
const BOARD_SCALE = BOARD_RECT.w / (BOARD_SURFACE.x1 - BOARD_SURFACE.x0);

/**
 * カット1枚の描画(本素材)。背景・黒板・キャラはクロマキー抜き済みPNG。
 */
export const CutView: React.FC<{
  project: VideoProject;
  scene: Scene;
  cut: Cut;
  timing: CutTiming;
}> = ({ project, scene, cut, timing }) => {
  const frame = useCurrentFrame();
  const alignments = useAlignments(cut);

  // カメラ: カット内で一方向に進む単純な移動(placeholder段階は移動だけ再現)
  const progress = interpolate(frame, [0, timing.durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing:
      cut.camera.easing === "linear"
        ? Easing.linear
        : cut.camera.easing === "out"
          ? Easing.out(Easing.ease)
          : Easing.inOut(Easing.ease),
  });
  const zoom = 1 + cut.camera.parallax.zoom * progress;
  const panX = cut.camera.parallax.panX * progress * project.meta.width;
  const panY = cut.camera.parallax.panY * progress * project.meta.height;

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `scale(${zoom}) translate(${-panX}px, ${-panY}px)`,
          backgroundColor: "#2b241d",
        }}
      >
        {/* 壁トーン: 背景画像の透過部(クロマキー穴)の裏地 */}
        <AbsoluteFill
          style={{
            background:
              cut.sound.ambience === "garden-evening"
                ? "linear-gradient(180deg, #c9a06a 0%, #a37c52 55%, #8a683f 100%)"
                : "linear-gradient(180deg, #e2d3ae 0%, #c9b68b 55%, #b3a077 100%)",
          }}
        />
        {/* 背景(書斎)。1120x2240を幅合わせで表示 */}
        <Img
          src={staticFile(
            `assets/cutout/bg/${cut.sound.ambience === "garden-evening" ? "study-evening" : "study-day"}.png`
          )}
          style={{ position: "absolute", left: 0, top: -120, width: 1080, height: 2160 }}
        />

        {/* 黒板: 素材の盤面矩形(428,262)-(1488,1026)をBOARD_RECTに合わせて配置 */}
        {cut.board?.visible ? (
          <>
            <Img
              src={staticFile("assets/cutout/bg/blackboard.png")}
              style={{
                position: "absolute",
                left: BOARD_RECT.x - BOARD_SURFACE.x0 * BOARD_SCALE,
                top: BOARD_RECT.y - BOARD_SURFACE.y0 * BOARD_SCALE,
                width: 1920 * BOARD_SCALE,
                height: 1280 * BOARD_SCALE,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: BOARD_RECT.x,
                top: BOARD_RECT.y,
                width: BOARD_RECT.w,
                height: BOARD_RECT.h,
              }}
            >
              <ChalkBoard project={project} cut={cut} timing={timing} />
            </div>
          </>
        ) : null}

        {/* キャラ: 口パク・目パチ・呼吸(絵はplaceholder、本素材で差し替え) */}
        {alignments
          ? cut.chars
              .filter((c) => c.visible)
              .map((c) => (
                <Character
                  key={`${c.speaker}-${c.pose}`}
                  project={project}
                  cut={cut}
                  layer={c}
                  timing={timing}
                  alignments={alignments}
                />
              ))
          : null}
        {/* 前景レイヤー: "name:args" 形式(teacup:x,y,w / steam:x,y) */}
        {(cut.fgLayers ?? []).map((spec) => {
          const [name, args = ""] = spec.split(":");
          const nums = args.split(",").map(Number);
          if (name === "teacup") {
            const [tx, ty, tw] = nums;
            return (
              <Img
                key={spec}
                src={staticFile("assets/cutout/fx/teacup.png")}
                style={{ position: "absolute", left: tx, top: ty, width: tw }}
              />
            );
          }
          if (name === "steam") {
            const [sx, sy] = nums;
            return <Steam key={spec} x={sx} y={sy} seed={`${cut.id}-${spec}`} />;
          }
          return null;
        })}
      </AbsoluteFill>

      {/* 空気感(木漏れ日・塵)と仕上げ(トーン・ビネット・グレイン) */}
      <Effects project={project} cut={cut} />
      <Grade cut={cut} />

      {/* 字幕(カメラ移動の影響を受けない) */}
      {alignments ? (
        <KaraokeSubtitle project={project} cut={cut} timing={timing} alignments={alignments} />
      ) : null}

      {/* 開発用オーバーレイ: カットID */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          color: "#ffffff88",
          fontSize: 34,
          fontFamily: "monospace",
        }}
      >
        {scene.id} / {cut.id} {cut.title}
      </div>
    </AbsoluteFill>
  );
};
