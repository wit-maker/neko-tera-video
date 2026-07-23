# Architecture Governance

Repository SSOT: `docs/architecture-governance.md`.

- States are OWNER_DIRECTIVE, REVIEW_GUARDRAIL, PROPOSED, OPEN, EXPERIMENT_RESULT, ACCEPTED_DECISION, REJECTED, and SUPERSEDED.
- Only OWNER_DIRECTIVE, REVIEW_GUARDRAIL, and ACCEPTED_DECISION belong in permanent project invariants; PROPOSED/OPEN are not implementation requirements.
- ACCEPTED_DECISION requires explicit mi3san approval plus an ADR or equivalent durable decision record.
- Character strategy v0.3 has completed Lapis goal-stage review and can move to Orbit P0 planning; candidate architecture and tool adoption are still PROPOSED.
- GOV-013 through GOV-016 are ACCEPTED_DECISION and recorded in `docs/adr/001-next-character-comparison-boundaries.md`.
- GOV-013: P1 yaw ±15 degrees and pitch ±10 degrees. GOV-014: initial selection is prerender-only; realtime is later.
- GOV-015: P2 preserves current identity, contour, fur, color planes, and oral expression; photorealism is not required.
- GOV-016: prefer local RTX 3060 Ti 8GB. Paid/cloud use requires mi3san's proactive instruction or explicit approval of a concrete proposal; silence and prior approval do not count.
- P0 planning blockers are cleared. Deferred items remain asset openness, full OSS requirements, proprietary editor allowance, and final evaluation weights.
