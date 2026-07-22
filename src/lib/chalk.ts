// チョーク風の手描き揺らぎパス生成。乱数はid由来のシードで決定的にする(Remotionはフレーム間で純粋である必要がある)。

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2点間を細かく分割し、垂直方向に揺らぎを与えた折れ線パス
export function wobblyLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: string,
  jitter = 2.2,
  segments = 14
): string {
  const rnd = mulberry32(hashSeed(seed));
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts: string[] = [`M ${x1} ${y1}`];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const j = i === segments ? 0 : (rnd() - 0.5) * 2 * jitter;
    pts.push(`L ${x1 + dx * t + nx * j} ${y1 + dy * t + ny * j}`);
  }
  return pts.join(" ");
}

// 半径に揺らぎを与えた閉じない円パス(書き始め/終わりがわずかに重なる手描き風)
export function wobblyCircle(cx: number, cy: number, r: number, seed: string, jitter = 3): string {
  const rnd = mulberry32(hashSeed(seed));
  const start = -Math.PI / 2 + (rnd() - 0.5) * 0.3;
  const total = Math.PI * 2 * 1.03; // 少し描き重ねる
  const n = 36;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = start + (total * i) / n;
    const rr = r + (rnd() - 0.5) * 2 * jitter;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    pts.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
  }
  return pts.join(" ");
}

// 矢印の先端(2本の短い線)
export function arrowHead(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: string,
  size = 18
): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const spread = 0.5;
  const p1x = x2 - Math.cos(a - spread) * size;
  const p1y = y2 - Math.sin(a - spread) * size;
  const p2x = x2 - Math.cos(a + spread) * size;
  const p2y = y2 - Math.sin(a + spread) * size;
  return `${wobblyLine(p1x, p1y, x2, y2, seed + "-h1", 1.2, 4)} ${wobblyLine(x2, y2, p2x, p2y, seed + "-h2", 1.2, 4)}`;
}
