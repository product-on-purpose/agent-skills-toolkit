# plan_v1.9.0 - standards watch and the decisions discipline

Maintainer-approved work outside the uplift program. Shipped 2026-07-27.

Two capabilities aimed at one failure mode: **a rule that exists and is not carried to every place it applies.**

- **Outward:** `askit-standards-watch` discharges `STANDARD.md` section 6's normative MUST that nothing implemented. The pin lives at `docs/internal/standards-watch/upstream-pin.json`.
- **Inward:** every ADR now carries `## Implementation sites` naming the exact files and functions that carry the decision.

## Why this took the v1.9.0 number

Adding a skill is a MINOR under semver, and the version is a promise to anyone installing from the marketplace. The uplift program had reserved v1.9.0 for marketplace scope; that becomes **v1.10.0**, and manage-and-studio becomes **v1.11.0**. Renumbering an internal plan is cheaper than misnumbering a public release. Release content is unchanged; only the labels move.

## The result worth recording

**The decisions discipline found a real gap on its first application.** Run against ADR 0038, written the day before and naming this exact pattern, the mandated grep surfaced four HTML render sites that fix had missed. A discipline that catches a live defect inside the decision that named the problem is about as strong a validation as one gets.

## Also in this release

CodeQL found `js/incomplete-sanitization` a fourth and fifth time, in new code by a third independent author. The earlier note said "worth revisiting if a third appears." A third appeared, so the three copies were collapsed into `scripts/lib/md-escape.mjs`.

## Re-pin

[repin-instructions.md](repin-instructions.md). Staged per the packet boundary.

601 tests, gate Advanced 0/0, spine 30 / Standard 0.12 unchanged, 24 skills.
