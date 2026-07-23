# Tooling Extension Strategy

Repository SSOT: `docs/tooling-extension-strategy.md`.

- Lapis approved the staged strategy, but it remains PROPOSED and is not an adopted toolchain.
- Prefer local RTX 3060 Ti 8GB. Paid/cloud use requires mi3san's proactive instruction or explicit approval of a concrete proposal; never infer approval from silence, a free tier, or past approval.
- Prefer CLI, then Python/API, then GUI automation, then MCP. Add tools only when they close the design-build-observe-correct-verify loop.
- Stage 1 proposal: independent benchmark core plus OIIO/OCIO and Blender 4.5 LTS Python CLI.
- Candidate-specific tools stay deferred until that candidate is tested: 2D editors, Live2D, Blender pipelines, or neural WSL2/container environments.
- Adoption/OSS stage may add CPU/GPU CI, license/SBOM checks, storage, docs, and signing.
- Never expose raw credentials, grant broad MCP authority, run untrusted code on a protected self-hosted runner, or use weights/assets without verified licenses.
