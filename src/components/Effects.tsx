import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Cut, VideoProject } from "../schema";
import { hashSeed, mulberry32 } from "../lib/chalk";

/**
 * 空気感の演出: 木漏れ日のライトレイ+漂う塵。ambienceで昼/夕の色味を変える。
 * すべてフレーム駆動の決定的アニメーション。
 */
export const Effects: React.FC<{ project: VideoProject; cut: Cut }> = ({ project, cut }) => {
  const frame = useCurrentFrame();
  const fps = project.meta.fps;
  const t = frame / fps;

  if (cut.sound.ambience === "none") return null;
  const evening = cut.sound.ambience === "garden-evening";
  const rayColor = evening ? "255, 176, 92" : "255, 236, 180";

  // 塵: シードで初期位置を決め、ゆっくり上昇+横に揺れる
  const rnd = mulberry32(hashSeed(`dust-${cut.id}`));
  const dust = Array.from({ length: 14 }, (_, i) => {
    const x0 = rnd() * 1080;
    const y0 = rnd() * 1920;
    const size = 2 + rnd() * 4;
    const speed = 6 + rnd() * 10;
    const phase = rnd() * Math.PI * 2;
    const y = ((y0 - t * speed) % 2000 + 2000) % 2000 - 40;
    const x = x0 + Math.sin(t * 0.4 + phase) * 30;
    return { key: i, x, y, size, opacity: 0.12 + rnd() * 0.15 };
  });

  // ライトレイ: 左上から斜めに2本、ゆっくり明滅
  const rayPulse = (offset: number) => 0.5 + Math.sin(t * 0.35 + offset) * 0.5;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[
        { left: -200, width: 340, angle: 24, pulse: rayPulse(0), base: 0.1 },
        { left: 220, width: 220, angle: 27, pulse: rayPulse(2.1), base: 0.07 },
      ].map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: -300,
            left: r.left,
            width: r.width,
            height: 2600,
            transform: `rotate(${r.angle}deg)`,
            transformOrigin: "top center",
            background: `linear-gradient(180deg, rgba(${rayColor}, ${r.base + r.pulse * 0.08}) 0%, rgba(${rayColor}, 0) 75%)`,
          }}
        />
      ))}
      {dust.map((d) => (
        <div
          key={d.key}
          style={{
            position: "absolute",
            left: d.x,
            top: d.y,
            width: d.size,
            height: d.size,
            borderRadius: "50%",
            backgroundColor: `rgba(${rayColor}, ${d.opacity})`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
