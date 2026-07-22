// 各カットの開始フレームと尺を一覧表示する(デバッグ/QC用)
import { readFileSync } from "node:fs";
import { VideoProject } from "../src/schema";
import { projectTiming } from "../src/lib/timing";

const project = VideoProject.parse(JSON.parse(readFileSync("video.json", "utf8")));
const manifest = JSON.parse(readFileSync("public/audio-manifest.json", "utf8"));
const timing = projectTiming(project, manifest, 60);

let cursor = 0;
for (const scene of project.scenes) {
  for (const cut of scene.cuts) {
    const ct = timing.cuts.get(cut.id)!;
    console.log(
      `${cut.id}\tfrom=${cursor}\tdur=${ct.durationFrames}\t(${(cursor / 60).toFixed(1)}s)`
    );
    cursor += ct.durationFrames;
  }
}
console.log(`total ${timing.totalFrames} frames = ${(timing.totalFrames / 60).toFixed(1)}s`);
