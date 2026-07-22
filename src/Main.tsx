import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import type { VideoProject } from "./schema";
import { projectTiming, type AudioManifestEntry } from "./lib/timing";
import { CutView } from "./components/CutView";

export type MainProps = {
  project: VideoProject;
  manifest: AudioManifestEntry[];
};

export const Main: React.FC<MainProps> = ({ project, manifest }) => {
  const timing = projectTiming(project, manifest, 60);

  let cursor = 0;
  const sequences: React.ReactNode[] = [];
  for (const scene of project.scenes) {
    for (const cut of scene.cuts) {
      const t = timing.cuts.get(cut.id)!;
      sequences.push(
        <Sequence key={cut.id} from={cursor} durationInFrames={t.durationFrames} name={cut.id}>
          <CutView project={project} scene={scene} cut={cut} timing={t} />
          {t.lines.map((line) => (
            <Sequence key={line.lineId} from={line.fromFrame} durationInFrames={line.durationFrames} name={`audio:${line.lineId}`}>
              <Audio src={staticFile(`audio/${line.lineId}.mp3`)} />
            </Sequence>
          ))}
        </Sequence>
      );
      cursor += t.durationFrames;
    }
  }

  return <AbsoluteFill style={{ backgroundColor: "#1a1512" }}>{sequences}</AbsoluteFill>;
};
