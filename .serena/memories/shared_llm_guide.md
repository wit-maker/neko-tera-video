# Shared LLM Guide

- Provider-neutral SSOT: `LLM_GUIDE.md`.
- Read it after `PROJECT_STATE.md` and before architecture or implementation work.
- Provider entrypoints are thin adapters: `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`.
- Do not duplicate shared rules into provider-specific memories because copies drift.
- Project-specific observed failures remain in `docs/anti-patterns.md`; decision states remain in `docs/architecture-governance.md`.
