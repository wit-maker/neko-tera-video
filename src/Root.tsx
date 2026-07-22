import React from "react";
import { Composition } from "remotion";
import { VideoProject } from "./schema";
import { projectTiming, type AudioManifestEntry } from "./lib/timing";
import { Main, type MainProps } from "./Main";
import rawProject from "../video.json";
import rawManifest from "../public/audio-manifest.json";

const project = VideoProject.parse(rawProject);
const manifest = rawManifest as AudioManifestEntry[];

const FPS = 60;

export const RemotionRoot: React.FC = () => {
  const timing = projectTiming(project, manifest, FPS);
  return (
    <Composition
      id="Main"
      component={Main}
      durationInFrames={timing.totalFrames}
      fps={FPS}
      width={project.meta.width}
      height={project.meta.height}
      defaultProps={{ project, manifest } satisfies MainProps}
    />
  );
};
