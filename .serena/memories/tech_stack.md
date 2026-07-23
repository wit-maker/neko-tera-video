# Tech Stack

- Windows/PowerShell repository; TypeScript ESM.
- Remotion 4 + React 18 for deterministic frame-driven composition; Zod 3 for project schema; Vitest 4; TypeScript 5.6; npm lockfile.
- Python scripts handle alignment and image processing; `.venv` is only for `pipeline/align.py` (stable-ts/Whisper). Image scripts use system `python` with Pillow/numpy.
- FFmpeg/ffprobe perform audio mixing, measurement, encode, and artifact validation.
- Current visual renderer is static character pose PNG plus discrete mouth patches. Next architecture candidates are specified in `docs/character-architecture-strategy.md`.