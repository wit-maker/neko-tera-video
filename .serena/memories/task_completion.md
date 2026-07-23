# Task Completion

- Always inspect `git diff --check` and scoped `git diff`; preserve unrelated user changes.
- TypeScript/code: `npm run typecheck` and `npm test`.
- `video.json`: additionally `npm run validate`.
- Visual changes: render representative final-display still(s); inspect normal delivery scale and relevant crop. Full render only when scope/risk requires it.
- Audio/delivery: measure independently with ffprobe/ffmpeg; do not trust pipeline success logs alone.
- Long-running render/training: confirm process/artifact start, then validate file existence, size, frame count/duration/decode at completion.
- If a reusable failure occurred, update `docs/anti-patterns.md` before completion and promote the lesson to validator/test/ADR/DoD where possible.
- Before architecture work completes, audit decision-state labels and ensure PROPOSED/OPEN items were not copied into permanent invariants.
- Do not call a proposal adopted until mi3san approves it and the decision is recorded in an ADR or equivalent record.