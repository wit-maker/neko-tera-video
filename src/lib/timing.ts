/**
 * カット尺の規則(SSOT派生):
 *   セリフありカット = HEAD + Σ(音声実測尺 + pauseAfterSec) + TAIL
 *   セリフなしカット = fixedDurationSec
 * audio-manifest.json(tts.tsが生成)の実測尺だけを信頼し、ここでは推定しない。
 */
import {
  CUT_PADDING_HEAD_SEC,
  CUT_PADDING_TAIL_SEC,
  type Cut,
  type VideoProject,
} from "../schema";

export type AudioManifestEntry = { lineId: string; file: string; durationMs: number };

export type LineTiming = {
  lineId: string;
  /** カット頭からの発話開始フレーム */
  fromFrame: number;
  /** 音声実測尺(フレーム) */
  durationFrames: number;
};

export type CutTiming = {
  cutId: string;
  durationFrames: number;
  lines: LineTiming[];
};

export function buildManifestMap(manifest: AudioManifestEntry[]): Map<string, AudioManifestEntry> {
  return new Map(manifest.map((m) => [m.lineId, m]));
}

export function cutTiming(cut: Cut, manifest: Map<string, AudioManifestEntry>, fps: number): CutTiming {
  if (cut.dialogue.length === 0) {
    if (cut.fixedDurationSec === undefined) {
      throw new Error(`${cut.id}: セリフなしカットに fixedDurationSec がありません`);
    }
    return { cutId: cut.id, durationFrames: Math.round(cut.fixedDurationSec * fps), lines: [] };
  }

  const lines: LineTiming[] = [];
  let cursorSec = CUT_PADDING_HEAD_SEC;
  for (const d of cut.dialogue) {
    const entry = manifest.get(d.id);
    if (!entry) throw new Error(`${d.id}: audio-manifest に実測尺がありません(先に npm run tts)`);
    const durationSec = entry.durationMs / 1000;
    lines.push({
      lineId: d.id,
      fromFrame: Math.round(cursorSec * fps),
      durationFrames: Math.ceil(durationSec * fps),
    });
    cursorSec += durationSec + d.pauseAfterSec;
  }
  cursorSec += CUT_PADDING_TAIL_SEC;
  return { cutId: cut.id, durationFrames: Math.round(cursorSec * fps), lines };
}

export type ProjectTiming = {
  totalFrames: number;
  cuts: Map<string, CutTiming>;
};

export function projectTiming(project: VideoProject, manifest: AudioManifestEntry[], fps: number): ProjectTiming {
  const map = buildManifestMap(manifest);
  const cuts = new Map<string, CutTiming>();
  let total = 0;
  for (const scene of project.scenes) {
    for (const cut of scene.cuts) {
      const t = cutTiming(cut, map, fps);
      cuts.set(cut.id, t);
      total += t.durationFrames;
    }
  }
  return { totalFrames: total, cuts };
}
