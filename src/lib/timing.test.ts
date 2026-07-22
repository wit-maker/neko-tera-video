import { describe, expect, it } from "vitest";
import {
  CUT_PADDING_HEAD_SEC,
  CUT_PADDING_TAIL_SEC,
  type Cut,
  type DialogueLine,
  type VideoProject,
} from "../schema";
import {
  type AudioManifestEntry,
  buildManifestMap,
  cutTiming,
  projectTiming,
} from "./timing";

const FPS = 60;

// timing.ts が実際に読むフィールド(id / speaker 等は不要な最小構成)だけを持つ
// テスト用ヘルパ。schema の全フィールドは timing の決定論導出に無関係なので
// 型アサーションで最小オブジェクトを構築する。
function line(id: string, pauseAfterSec: number): DialogueLine {
  return { id, pauseAfterSec } as unknown as DialogueLine;
}

function cut(partial: {
  id: string;
  dialogue?: DialogueLine[];
  fixedDurationSec?: number;
}): Cut {
  return {
    id: partial.id,
    dialogue: partial.dialogue ?? [],
    fixedDurationSec: partial.fixedDurationSec,
  } as unknown as Cut;
}

function entry(lineId: string, durationMs: number): AudioManifestEntry {
  return { lineId, file: `${lineId}.wav`, durationMs };
}

describe("buildManifestMap", () => {
  it("lineId をキーにしたマップを作る", () => {
    const map = buildManifestMap([entry("a", 1000), entry("b", 2000)]);
    expect(map.size).toBe(2);
    expect(map.get("a")?.durationMs).toBe(1000);
    expect(map.get("b")?.durationMs).toBe(2000);
  });

  it("空配列では空マップ", () => {
    expect(buildManifestMap([]).size).toBe(0);
  });

  it("同一 lineId は後勝ち(Map の仕様)", () => {
    const map = buildManifestMap([entry("a", 1000), entry("a", 3000)]);
    expect(map.size).toBe(1);
    expect(map.get("a")?.durationMs).toBe(3000);
  });
});

describe("cutTiming - セリフなしカット(固定尺)", () => {
  it("fixedDurationSec を fps 倍して四捨五入する", () => {
    const t = cutTiming(cut({ id: "s1c1", fixedDurationSec: 2.5 }), new Map(), FPS);
    expect(t).toEqual({ cutId: "s1c1", durationFrames: 150, lines: [] });
  });

  it("境界: fixedDurationSec=0 は 0 フレーム", () => {
    const t = cutTiming(cut({ id: "s1c1", fixedDurationSec: 0 }), new Map(), FPS);
    expect(t.durationFrames).toBe(0);
  });

  it("境界: round で切り下げ(1.008s → 60.48 → 60)", () => {
    const t = cutTiming(cut({ id: "c", fixedDurationSec: 1.008 }), new Map(), FPS);
    expect(t.durationFrames).toBe(60);
  });

  it("境界: round で切り上げ(1.009s → 60.54 → 61)", () => {
    const t = cutTiming(cut({ id: "c", fixedDurationSec: 1.009 }), new Map(), FPS);
    expect(t.durationFrames).toBe(61);
  });

  it("fixedDurationSec が無ければ throw する", () => {
    expect(() => cutTiming(cut({ id: "s1c1" }), new Map(), FPS)).toThrow(
      /fixedDurationSec/
    );
  });
});

describe("cutTiming - セリフありカット(実測尺からの決定論導出)", () => {
  it("代表: 1 行。HEAD 起点の開始フレームと ceil の尺、round の総尺", () => {
    const manifest = buildManifestMap([entry("s1c1-01", 1000)]);
    const c = cut({ id: "s1c1", dialogue: [line("s1c1-01", 0.4)] });
    const t = cutTiming(c, manifest, FPS);

    // fromFrame = round(HEAD * fps) = round(0.35 * 60) = 21
    // durationFrames = ceil(1.0s * 60) = 60
    expect(t.lines).toEqual([{ lineId: "s1c1-01", fromFrame: 21, durationFrames: 60 }]);

    // 総尺 = round((HEAD + 1.0 + pause 0.4 + TAIL) * fps)
    //      = round((0.35 + 1.0 + 0.4 + 0.55) * 60) = round(2.3 * 60) = 138
    expect(t.durationFrames).toBe(138);
    expect(t.cutId).toBe("s1c1");
  });

  it("代表: 複数行は (実測尺 + pauseAfterSec) を累積して次行の開始位置を決める", () => {
    const manifest = buildManifestMap([
      entry("l1", 250), // 0.25s
      entry("l2", 500), // 0.5s
    ]);
    const c = cut({
      id: "s1c2",
      dialogue: [line("l1", 0.4), line("l2", 0.2)],
    });
    const t = cutTiming(c, manifest, FPS);

    // l1: from = round(0.35*60)=21, dur = ceil(0.25*60)=15
    // cursor -> 0.35 + 0.25 + 0.4 = 1.0
    // l2: from = round(1.0*60)=60, dur = ceil(0.5*60)=30
    expect(t.lines).toEqual([
      { lineId: "l1", fromFrame: 21, durationFrames: 15 },
      { lineId: "l2", fromFrame: 60, durationFrames: 30 },
    ]);

    // cursor -> 1.0 + 0.5 + 0.2 = 1.7, +TAIL 0.55 = 2.25 -> round(135) = 135
    expect(t.durationFrames).toBe(135);
  });

  it("境界: どんな微小音声でも尺は最低 1 フレーム(ceil)", () => {
    const manifest = buildManifestMap([entry("l1", 1)]); // 0.001s -> 0.06f
    const c = cut({ id: "c", dialogue: [line("l1", 0)] });
    const t = cutTiming(c, manifest, FPS);
    expect(t.lines[0].durationFrames).toBe(1);
  });

  it("境界: 尺は ceil(切り上げ)で丸める(1.001s → 60.06 → 61、round と異なる)", () => {
    const manifest = buildManifestMap([entry("l1", 1001)]);
    const c = cut({ id: "c", dialogue: [line("l1", 0)] });
    const t = cutTiming(c, manifest, FPS);
    expect(t.lines[0].durationFrames).toBe(61);
  });

  it("境界: フレーム境界ぴったりの尺は ceil でもその値のまま(1000ms → 60)", () => {
    const manifest = buildManifestMap([entry("l1", 1000)]);
    const c = cut({ id: "c", dialogue: [line("l1", 0)] });
    const t = cutTiming(c, manifest, FPS);
    expect(t.lines[0].durationFrames).toBe(60);
  });

  it("pauseAfterSec=0 は次行の開始が直前尺のみで決まる", () => {
    const manifest = buildManifestMap([entry("l1", 500), entry("l2", 500)]);
    const c = cut({ id: "c", dialogue: [line("l1", 0), line("l2", 0)] });
    const t = cutTiming(c, manifest, FPS);
    // l2 from = round((0.35 + 0.5) * 60) = round(51) = 51
    expect(t.lines[1].fromFrame).toBe(51);
  });

  it("manifest に実測尺が無ければ throw する", () => {
    const c = cut({ id: "c", dialogue: [line("missing", 0.4)] });
    expect(() => cutTiming(c, new Map(), FPS)).toThrow(/audio-manifest/);
  });

  it("fps を変えても同じ規則でスケールする(fps=30)", () => {
    const manifest = buildManifestMap([entry("l1", 1000)]);
    const c = cut({ id: "c", dialogue: [line("l1", 0.4)] });
    const t = cutTiming(c, manifest, 30);
    // from = round(0.35*30)=round(10.5)=11, dur = ceil(1.0*30)=30
    expect(t.lines[0]).toEqual({ lineId: "l1", fromFrame: 11, durationFrames: 30 });
    // 総尺 = round(2.3 * 30) = round(69) = 69
    expect(t.durationFrames).toBe(69);
  });
});

describe("パディング定数(SSOT)", () => {
  it("HEAD/TAIL は想定値", () => {
    expect(CUT_PADDING_HEAD_SEC).toBe(0.35);
    expect(CUT_PADDING_TAIL_SEC).toBe(0.55);
  });
});

describe("projectTiming", () => {
  function project(scenes: VideoProject["scenes"]): VideoProject {
    return { scenes } as unknown as VideoProject;
  }

  it("全カットの尺を合算し、cutId でひける Map を返す", () => {
    const manifest: AudioManifestEntry[] = [entry("l1", 1000)];
    const proj = project([
      {
        id: "s1",
        title: "",
        cuts: [
          cut({ id: "s1c1", dialogue: [line("l1", 0.4)] }), // 138
          cut({ id: "s1c2", fixedDurationSec: 2.5 }), // 150
        ],
      },
    ]);

    const t = projectTiming(proj, manifest, FPS);
    expect(t.totalFrames).toBe(288);
    expect(t.cuts.size).toBe(2);
    expect(t.cuts.get("s1c1")?.durationFrames).toBe(138);
    expect(t.cuts.get("s1c2")?.durationFrames).toBe(150);
  });

  it("複数シーンをまたいで合算する", () => {
    const proj = project([
      { id: "s1", title: "", cuts: [cut({ id: "a", fixedDurationSec: 1 })] },
      { id: "s2", title: "", cuts: [cut({ id: "b", fixedDurationSec: 2 })] },
    ]);
    const t = projectTiming(proj, [], FPS);
    expect(t.totalFrames).toBe(180); // 60 + 120
    expect([...t.cuts.keys()]).toEqual(["a", "b"]);
  });

  it("カットが無ければ 0 フレーム", () => {
    const t = projectTiming(project([]), [], FPS);
    expect(t.totalFrames).toBe(0);
    expect(t.cuts.size).toBe(0);
  });
});
