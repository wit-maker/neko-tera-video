import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Cut } from "../schema";

/**
 * 仕上げのグレーディング: ビネット+フィルムグレイン+昼/夕のトーン。
 * 全レイヤーの最前面に重ねる(字幕より下、devオーバーレイより下でカット単位に適用)。
 */
export const Grade: React.FC<{ cut: Cut }> = ({ cut }) => {
  const frame = useCurrentFrame();
  const evening = cut.sound.ambience === "garden-evening";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* トーン: 昼はわずかに金色、夕は琥珀色を乗せる */}
      <AbsoluteFill
        style={{
          background: evening
            ? "linear-gradient(200deg, rgba(255,140,60,0.10) 0%, rgba(60,30,60,0.12) 100%)"
            : "linear-gradient(200deg, rgba(255,220,150,0.06) 0%, rgba(40,30,20,0.08) 100%)",
          mixBlendMode: "overlay",
        }}
      />
      {/* ビネット */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 75% 60% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.34) 100%)",
        }}
      />
      {/* グレイン: フレームごとにノイズのシードを変える */}
      <AbsoluteFill style={{ opacity: 0.05, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed={frame % 120}
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
