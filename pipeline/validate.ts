/** video.json をzodスキーマで検証し、行ID重複・参照整合もチェックする。 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VideoProject } from "../src/schema";

const path = join(import.meta.dirname, "..", "video.json");
const project = VideoProject.parse(JSON.parse(readFileSync(path, "utf8")));

const errors: string[] = [];
const lineIds = new Set<string>();

for (const scene of project.scenes) {
  for (const cut of scene.cuts) {
    if (cut.dialogue.length === 0 && cut.fixedDurationSec === undefined) {
      errors.push(`${cut.id}: セリフなしカットに fixedDurationSec がありません`);
    }
    for (const d of cut.dialogue) {
      if (lineIds.has(d.id)) errors.push(`行ID重複: ${d.id}`);
      lineIds.add(d.id);
    }
    for (const action of cut.board?.actions ?? []) {
      if (action.atLineId && !cut.dialogue.some((d) => d.id === action.atLineId)) {
        errors.push(`${cut.id}: 黒板アクションが未知の行ID ${action.atLineId} を参照`);
      }
    }
    for (const sub of cut.subtitle?.lines ?? []) {
      if (!cut.dialogue.some((d) => d.id === sub.lineId)) {
        errors.push(`${cut.id}: 字幕が未知の行ID ${sub.lineId} を参照`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`検証エラー ${errors.length} 件:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `OK: ${project.scenes.length}シーン / ` +
    `${project.scenes.reduce((n, s) => n + s.cuts.length, 0)}カット / ${lineIds.size}セリフ行`
);
