# Anti-Patterns

Repository SSOT: `docs/anti-patterns.md`; legacy evidence: `docs/cto-handoff.md` section 17.

- Record only observed, reusable failures with evidence, root cause, forbidden pattern, replacement, scope, and promotion target.
- No blame, secrets, credentials, or raw prompts.
- Never delete history; supersede with a successor ID.
- A log entry alone is insufficient: promote preventable recurrence to validator, test, template, ADR, or acceptance gate.
- Active invariants: verify assumptions independently; evaluate final display rather than intermediate assets; validate artifacts rather than job notifications; never force one asset structure across architecture comparisons; ensure every recorded lesson changes the workflow where possible.
- AP-006: on Windows run Serena memory checks with `$env:PYTHONUTF8 = '1'`; default CP932 can raise `UnicodeEncodeError` while printing the success check mark.