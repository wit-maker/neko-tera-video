import React from "react";
import { cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import type { Cut, VideoProject } from "../schema";
import type { CutTiming } from "../lib/timing";
import { arrowHead, wobblyCircle, wobblyLine } from "../lib/chalk";

const loadLocalFont = (family: string, file: string, weight: string): string => {
  if (typeof document === "undefined") return family;
  const handle = delayRender(`Load local font ${file}`);
  const font = new FontFace(family, `url(${staticFile(file)}) format("truetype")`, { style: "normal", weight });
  font.load().then((loaded) => {
    (document.fonts as unknown as { add(value: FontFace): void }).add(loaded);
    continueRender(handle);
  }).catch((error: unknown) => cancelRender(error instanceof Error ? error : new Error(String(error))));
  return family;
};

const fontFamily = loadLocalFont("Yusei Magic", "fonts/YuseiMagic-Regular.ttf", "400");

const CHALK = "#eeeae0";
const CHALK_EMPHASIS = "#f2d478";
const STROKE_W = 5;

type BoardAction = NonNullable<Cut["board"]>["actions"][number];

// 黒板は物語を通して1枚。過去カットで描かれた要素は描き終わった状態で持ち越し、
// erase要素で消されたものは以降のカットでも消えたままにする。
const collectActions = (project: VideoProject, currentCutId: string) => {
  const prior: BoardAction[] = [];
  for (const scene of project.scenes) {
    for (const cut of scene.cuts) {
      if (cut.id === currentCutId) return prior;
      if (cut.board) prior.push(...cut.board.actions);
    }
  }
  return prior;
};

export const ChalkBoard: React.FC<{
  project: VideoProject;
  cut: Cut;
  timing: CutTiming;
}> = ({ project, cut, timing }) => {
  const frame = useCurrentFrame();
  const fps = project.meta.fps;

  const current = cut.board?.actions ?? [];
  const prior = collectActions(project, cut.id);

  // 各アクションの進行度: 過去カット分は常に1、現行カット分はフレームから算出
  const progressOf = (a: BoardAction, isPrior: boolean): number => {
    if (isPrior) return 1;
    const lineStart = a.atLineId
      ? (timing.lines.find((l) => l.lineId === a.atLineId)?.fromFrame ?? 0)
      : 0;
    const start = lineStart + a.offsetSec * fps;
    const dur = Math.max(1, a.drawDurationSec * fps);
    return Math.min(1, Math.max(0, (frame - start) / dur));
  };

  // 消し進行度: targetId → 0..1
  const eraseProgress = new Map<string, number>();
  for (const [list, isPrior] of [
    [prior, true],
    [current, false],
  ] as const) {
    for (const a of list) {
      if (a.element.kind !== "erase") continue;
      const p = progressOf(a, isPrior);
      for (const t of a.element.targets) {
        eraseProgress.set(t, Math.max(eraseProgress.get(t) ?? 0, p));
      }
    }
  }

  const renderElement = (a: BoardAction, isPrior: boolean) => {
    const el = a.element;
    if (el.kind === "erase") return null;
    const p = progressOf(a, isPrior);
    if (p <= 0) return null;
    const opacity = (1 - (eraseProgress.get(el.id) ?? 0)) * 0.95;
    if (opacity <= 0.01) return null;

    if (el.kind === "circle") {
      return (
        <path
          key={el.id}
          d={wobblyCircle(el.cx, el.cy, el.r, el.id)}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
          stroke={CHALK}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          fill="none"
          opacity={opacity}
        />
      );
    }
    if (el.kind === "line") {
      return (
        <path
          key={el.id}
          d={wobblyLine(el.x1, el.y1, el.x2, el.y2, el.id)}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
          stroke={CHALK}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          fill="none"
          opacity={opacity}
        />
      );
    }
    if (el.kind === "arrow") {
      // 幹→先端の順に描く。両矢印は始端側の先端も同時に描く
      const shaftP = Math.min(1, p / 0.75);
      const headP = Math.max(0, Math.min(1, (p - 0.75) / 0.25));
      return (
        <g key={el.id} opacity={opacity}>
          <path
            d={wobblyLine(el.x1, el.y1, el.x2, el.y2, el.id)}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - shaftP}
            stroke={CHALK}
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            fill="none"
          />
          {headP > 0 ? (
            <g opacity={headP}>
              <path
                d={arrowHead(el.x1, el.y1, el.x2, el.y2, el.id + "-head")}
                stroke={CHALK}
                strokeWidth={STROKE_W}
                strokeLinecap="round"
                fill="none"
              />
              {el.doubleHead ? (
                <path
                  d={arrowHead(el.x2, el.y2, el.x1, el.y1, el.id + "-head2")}
                  stroke={CHALK}
                  strokeWidth={STROKE_W}
                  strokeLinecap="round"
                  fill="none"
                />
              ) : null}
            </g>
          ) : null}
        </g>
      );
    }
    // label: フォント文字。フェード+わずかな沈み込みで「書かれた」感を出す
    const rise = (1 - p) * 6;
    return (
      <text
        key={el.id}
        x={el.x}
        y={el.y + rise}
        fontSize={el.size}
        fontFamily={fontFamily}
        fill={el.emphasis ? CHALK_EMPHASIS : CHALK}
        textAnchor="middle"
        dominantBaseline="middle"
        opacity={opacity * Math.min(1, p * 1.4)}
      >
        {el.text}
      </text>
    );
  };

  return (
    <svg
      viewBox="0 0 900 640"
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <defs>
        {/* チョークの掠れ: ノイズで輪郭をわずかに変位させる */}
        <filter id="chalk-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" />
        </filter>
      </defs>
      <g filter="url(#chalk-rough)">
        {prior.map((a) => renderElement(a, true))}
        {current.map((a) => renderElement(a, false))}
      </g>
    </svg>
  );
};
