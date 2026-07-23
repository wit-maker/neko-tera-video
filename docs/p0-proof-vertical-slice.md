# P0 proof vertical slice

## Scope and boundary

P0 uses the existing representation A pipeline and existing assets only. It records one `s7c6`
baseline for reproducible evidence. This is a P0-only working contract: neither its schemas nor
its review UI automatically promotes an architecture, ADR, candidate selection, or quality approval.

Out of scope: a new representation, enhancement, phoneme recognition, real-time processing,
new dependencies, cloud, paid services, external APIs, Vault work, PR #18, Knowledge extraction,
Community Plugins, and automatic synchronization.

## Fixed baseline

- `baseline_source_commit`: `e43ebb29148216216bd85c3d681f46e1d3b2fa13`
- cut `s7c6`; global frames `17617..18235`; 619 frames at 60 fps
- baseline command: `.\node_modules\.bin\remotion.cmd render Main out\p0\a-s7c6-e43ebb2\baseline.mp4 --frames=17617-18235 --codec=h264 --crf=16`
- review stills: local `0`, `309`, `618`; global `17617`, `17926`, `18235`
- review slow speed uses HTML `video.playbackRate = 0.25`; no derived slow video is produced.

Tracked text identity is checked with canonical Git blob IDs (including the lockfile), never raw
worktree SHA-256. Binary input identity is SHA-256. `p0_tool_commit` is stored independently in
the manifest, so P0 code can advance without claiming that its HEAD equals the baseline source.

## P0 contract

`manifest.json`, `conformance.json`, and `evaluation.json` are separate artifacts. Conformance
verifies existence, output SHA-256, `ffprobe -count_frames`, 60 fps/dimensions, and all-frame
`ffmpeg` decode. `conformance=pass` is only contract conformance, not a quality approval or
representation decision. Evaluation records review assets, observations, known failures, or
`not_evaluated`; it has no score, ranking, pass, or adoption field.

The review UI distinguishes `review-ready`, `invalid`, `not-evaluated`, and `known-failure`.
Invalid artifacts are excluded from normal review.

## Commands

After P0 tool code is intentionally committed, execute in this order:

```powershell
npm run p0:verify-input
npm run p0:render
npm run p0:manifest
npm run p0:validate
npm run p0:evaluate
npm run p0:present
npm run p0:negative-test
npm run p0:verify
```

The ignored artifact directory is `out/p0/a-s7c6-e43ebb2/`. Its execution commit, command,
tool versions, artifact SHA-256, conformance result, evaluation state, and saved location are
recorded in the execution record below before handoff.

## Execution record

The approved run is **blocked**, not accepted. The existing pipeline attempted external font
requests during rendering, which violates the P0 no-external-API condition. The render was
stopped before it could become a valid artifact; do not use either archived attempt for review.

- execution path: A — existing local checkout `node_modules`, linked into this worktree without install or dependency changes
- execution commit / p0 tool commit: `586a7e0c4f42c26e4a309a99316ab894f9ea0671`
- quarantined invalid artifact locations: `out/p0/a-s7c6-e43ebb2-pre-final-3ef3ffe/` and `out/p0/a-s7c6-e43ebb2-blocked-external-font/`
- accepted baseline SHA-256 / conformance / evaluation: **none**
- observed blocker: `@remotion/google-fonts` loaded Yusei Magic and Klee One through network requests (121 and 124 requests respectively)
- tool versions: Node `v24.15.0`, npm `11.14.1`, Remotion `4.0.494`, FFmpeg/FFprobe `8.1.1`

## Stop conditions

Stop instead of expanding scope if any fixed input identity fails; the baseline needs a new
dependency, `npm install`, unapproved `npm ci`, cloud, paid service, external API, or external
asset; conformance and evaluation cannot stay separate; or an invalid fixture would mutate a
source asset or normal artifact. The only allowed environment route is the approved existing
local checkout's `node_modules`, referenced without changing that checkout.
