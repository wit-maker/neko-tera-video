# Suggested Commands

- `npm run studio` — Remotion preview.
- `npm run validate` — validate `video.json` and generated contracts.
- `npm run typecheck` — TypeScript check.
- `npm test` — Vitest suite.
- `npm run render` — render `Main` to `out/master.mp4`.
- `npm run mix` — build measured master audio.
- `npm run encode` — mux and verify delivery artifact.
- `npx remotion still Main --frame=<N> --output=out/qc.png` — final-display still check; composition id is `Main`.
- Image processing scripts: `python pipeline/<script>.py`; never `.venv/Scripts/python.exe`.
- PowerShell review: `git status --short`; `git diff --check`; `git diff -- <path>`.
- Serena memory reference sanity on Windows: `$env:PYTHONUTF8 = '1'; serena memories check` from repository root. Without UTF-8 mode, the CLI can fail while printing its Unicode check mark (AP-006).