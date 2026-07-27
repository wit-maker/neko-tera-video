import sequenceFile from "./p1-sequences.json";
import { validateSequenceFile, type P1SequenceFile } from "./sequence";

const file = sequenceFile as P1SequenceFile;
const errors = validateSequenceFile(file);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `p1-i1 P1 comparison sequence track is structurally valid (${file.sequences.length} sequences, ${file.endFrameExclusive - file.startFrame} frames, status=${file.status}); no render was executed and no quality or representation decision was made.`,
);
