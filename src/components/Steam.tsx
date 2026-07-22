import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { hashSeed, mulberry32 } from "../lib/chalk";

/**
 * 湯のみの湯気: ぼかした小円が揺れながら立ち上るループ。フレーム駆動の決定的アニメーション。
 * (x, y) は湯気の発生点(表示座標)。
 */
export const Steam: React.FC<{ x: number; y: number; seed: string; scale?: number }> = ({
  x,
  y,
  seed,
  scale = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const rnd = mulberry32(hashSeed(`steam-${seed}`));
  const wisps = Array.from({ length: 7 }, (_, i) => {
    const cycle = 3.2 + rnd() * 1.8; // 立ち上りの周期(秒)
    const delay = rnd() * cycle;
    const swayAmp = (8 + rnd() * 14) * scale;
    const swayHz = 0.35 + rnd() * 0.3;
    const size = (26 + rnd() * 26) * scale;
    const rise = (150 + rnd() * 70) * scale;
    const p = ((t + delay) % cycle) / cycle; // 0→1
    const wy = y - p * rise;
    const wx = x + Math.sin((t + delay) * Math.PI * 2 * swayHz + i) * swayAmp * (0.4 + p);
    // 出現→拡散して消える
    const opacity = Math.sin(Math.PI * p) * 0.22;
    const grow = 0.7 + p * 0.9;
    return { key: i, wx, wy, size: size * grow, opacity };
  });

  return (
    <>
      {wisps.map((w) => (
        <div
          key={w.key}
          style={{
            position: "absolute",
            left: w.wx - w.size / 2,
            top: w.wy - w.size / 2,
            width: w.size,
            height: w.size * 1.4,
            borderRadius: "50%",
            backgroundColor: `rgba(255, 252, 244, ${w.opacity})`,
            filter: "blur(10px)",
          }}
        />
      ))}
    </>
  );
};
