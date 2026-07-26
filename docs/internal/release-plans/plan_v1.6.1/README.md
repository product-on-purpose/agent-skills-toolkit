# plan_v1.6.1 - the trust patch

The v1.6.1 release folder. Unlike the larger release packets beside it, v1.6.1 needed no program plan: it is a single-decision patch whose full design, alternatives, measured before/after, and accepted trade-offs live in the ADR rather than in a spec packet.

- **The decision:** [`../../decisions/0036-calibrate-u12-diagram-grammar-and-u6-template-slots.md`](../../decisions/0036-calibrate-u12-diagram-grammar-and-u6-template-slots.md) - U12 diagram-type-aware bracket counting (PSR-1, PSR-2), U6 template-slot link targets (PSR-3), and the presentation-only display pair (PSR-6, PSR-7).
- **The evidence:** the 2026-07-19 coupled portfolio audit, gitignored under `_local/audit/2026-07-19_fable_pop/` (findings, five migration plans, fifteen sensor readings) and `_local/audit/2026-07-19_fable_agent/` (dispositions and the Phase D code-level verification).
- **The staged re-pin:** [`repin-instructions.md`](repin-instructions.md) - awaiting the maintainer; this repo does not write to `agent-plugins`.

Shipped 2026-07-25: tag `v1.6.1` at `cd12e10`, GitHub release live and Latest, 442 tests, gate Advanced 0/0, spine 30 / Standard 0.12 unchanged.
