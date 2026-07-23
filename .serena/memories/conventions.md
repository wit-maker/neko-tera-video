# Conventions

- `video.json` is current-video SSOT; validate with Zod before scope queries. Raw JSON does not contain Zod defaults.
- Mechanical transforms are deterministic/idempotent. Destructive asset transforms rebuild from `_orig/`; applied conversions use explicit markers.
- Animation is frame-driven (`useCurrentFrame`); do not use CSS animation or uncontrolled time/physics.
- Visual acceptance uses final composite at delivery scale plus targeted crop/slow evidence; intermediate assets alone cannot prove quality.
- Long jobs separate start confirmation from completion/artifact validation.
- For architecture work, separate OWNER_DIRECTIVE, REVIEW_GUARDRAIL, PROPOSED, OPEN, EXPERIMENT_RESULT, ACCEPTED_DECISION, REJECTED, and SUPERSEDED states.
- PROPOSED/OPEN content is not an implementation requirement. Promotion to a permanent invariant requires mi3san approval plus an ADR or equivalent decision record.
- Keep observable failures separate from future risks; only observed, evidenced failures enter the anti-pattern ledger.
- Do not put secrets, credentials, raw prompts, or `.env` content in repository artifacts.
- Reusable failures follow `mem:anti_patterns` and must be promoted to a mechanical gate when possible.