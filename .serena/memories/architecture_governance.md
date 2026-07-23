# Architecture Governance

Repository SSOT: `docs/architecture-governance.md`.

- States are OWNER_DIRECTIVE, REVIEW_GUARDRAIL, PROPOSED, OPEN, EXPERIMENT_RESULT, ACCEPTED_DECISION, REJECTED, and SUPERSEDED.
- Only OWNER_DIRECTIVE, REVIEW_GUARDRAIL, and ACCEPTED_DECISION belong in permanent project invariants; PROPOSED/OPEN are not implementation requirements.
- ACCEPTED_DECISION requires explicit mi3san approval plus an ADR or equivalent durable decision record.
- Current next-character strategy v0.2 and tooling extension strategy are Atlas proposals awaiting Lapis rereview.
- Before P0 task planning, mi3san must decide GOV-013 through GOV-016: temporary yaw/pitch, prerender vs realtime, minimum style target, and cloud/additional-cost boundary.
- Deferred items are asset openness, full OSS requirements, proprietary editor allowance, and final evaluation weights.
