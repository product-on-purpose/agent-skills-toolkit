# 0058 - A vendor that silently drops a component is a finding, and the proxy that detects it is declared

## TL;DR

- **Decision: a new numbered Universal check, `U18` (`command-size-cap`), warns when a `commands/*.md` on a plugin that declares `codex` as an agent-target exceeds the byte cap at which Codex's command migration refuses it.** Ships at `since: "0.16"` with a finding-level `until: "0.17"`, moving the spine from 34 checks to 35.
- **The vendor SKIPS the command; it does not truncate it.** `openai/codex`, `codex-rs/core-plugins/src/command_migration.rs` lines 165-169, read 2026-09-05 at commit `52e73e3a548ae5310c7765995b9803dd538b82b0`: `if let CommandSkillSizeLimit::MaxBytes(max_bytes) = size_limit && rendered.len() > max_bytes { continue; }`. The loop moves to the next command, no `SKILL.md` is written, and nothing raises an error. **The resolution plan's RS-C3 row said "silent truncation / degradation of the migrated skill" and that is wrong**, which is recorded here rather than quietly corrected: a truncated skill still exists and a reader can notice it stops mid-sentence, while a skipped one is absent, and absence has no symptom.
- **That asymmetry is the whole argument for the check.** Every other thing the spine grades is visible to an author who looks. This one is not: the plugin ships, the command is in the repository, and on Codex it simply is not there. A defect with no symptom is exactly what a deterministic gate is for.
- **The check measures the SOURCE file; the vendor caps the RENDERED skill. The proxy is declared, not hidden.** `render_command_skill()` strips the command's own frontmatter and writes generated skill frontmatter in its place, so the raw size over-reads in one direction and under-reads in the other. The declaration appears in three places - the check's docblock, the finding's own message, and this ADR - because a measurement presented as something it is not is the failure mode this project grades other tools on.
- **Reproducing the renderer was considered and REFUSED.** It is a private function in a vendor's Rust crate that this project cannot pin, cannot observe from outside, and would diverge from silently at the vendor's next refactor. `vendor-watch` has no instrument for "a function still renders the way we assumed", so the claim would rot with nothing to detect the rot - the [ADR 0053 (a pin label is a claim)](0053-a-pin-label-is-a-claim-and-behind-is-not-a-defect.md) failure mode one layer down.
- **`warn` severity is what makes the proxy honest.** A warn says "this is at risk, check it". An error would assert a fact about rendered output the check never measured. The severity and the measurement choice are one decision, not two.
- **A standalone numbered check rather than a scope extension of the command-shape surface.** RS-C3 left this open. The fact asserted is about a vendor's migration behaviour, not about a command's shape, and the two have different provenance (`vendor-cited` against `house`), different lifetimes, and different re-verification instruments. Folding it into an existing check would put a dated vendor read inside a check nothing re-reads.
- **`since` AND `until`, never `since` alone.** `since: "0.16"` alone would gate the moment a consumer advanced their pin to 0.16, giving a plugin that adopts the revision zero migration window for a check that did not exist when its commands were written. `until: "0.17"` alone would leave a plugin pinned below 0.16 exposed to a check that did not exist at its pin. Both bind; the reported `due` is the maximum across them, per [ADR 0044 (one post-resolution Standard ceiling)](0044-one-post-resolution-standard-ceiling-and-config-provenance.md).
- **Blast radius measured, not argued: zero movement.** All six reference-family members graded at the catalogue's pinned shas before and after. This repository's own two commands are 372 and 363 bytes against a 4000-byte cap.
- **Status:** **Accepted (2026-09-05).** Implemented in the same change.

- **Date:** 2026-09-05
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on

- **[ADR 0044 (one post-resolution Standard ceiling and config provenance)](0044-one-post-resolution-standard-ceiling-and-config-provenance.md)** - supplies the `since` + finding-level `migration` pairing this check uses, and the rule that the reported `due` is the maximum across active constraints.
- **[ADR 0052 (a catalogue manifest no scope can read is a defect)](0052-a-catalogue-manifest-no-scope-can-read-is-a-defect.md)** - the reference implementation of a warn-first Universal check carrying both constraints at once, and the source of the ACTIVATION-NEUTRAL wording rule for the migration `reason`.
- **[ADR 0029 (reclassify U2 and U5 from portable to house provenance)](0029-reclassify-u2-u5-as-house-provenance.md)** - established that a check must not grade a plugin against a convention it never adopted, and gave the `plain-plugin` profile the off-set that enforces it. `U18` reaches the same place by scoping rather than by profile: it is vendor-cited and portable, but only for a plugin that declared the vendor.
- **[ADR 0053 (a pin label is a claim, and behind is not a defect)](0053-a-pin-label-is-a-claim-and-behind-is-not-a-defect.md)** - the reason the renderer is not reimplemented: a claim with no instrument that can detect its drift is a claim that will drift undetected.

## Context and problem statement

Codex does not run a plugin's `commands/*.md` as commands. It migrates them into skills, once, and grades the result by size. The migration is in `codex-rs/core-plugins/src/command_migration/plugin.rs`, which sets the bound:

```rust
const MAX_MIGRATED_COMMAND_SKILL_BYTES: usize = 4_000;
```

and in `command_migration.rs`, which enforces it:

```rust
if let CommandSkillSizeLimit::MaxBytes(max_bytes) = size_limit
    && rendered.len() > max_bytes
{
    continue;
}
fs::create_dir_all(&target_dir)?;
fs::write(target_dir.join("SKILL.md"), rendered)?;
```

The `continue` is the finding. An oversized command does not become a smaller skill; it becomes no skill. The author's plugin is smaller on Codex than it is in their repository, the plugin still installs, the gate still passes, and nothing anywhere says a component went missing.

This project has named the idea twice before and dropped it both times, which is itself part of the context: a defect whose only symptom is an absence is easy to keep deferring, because nothing ever surfaces to force the issue.

## Decision

Ship `U18` (`command-size-cap`) as described in the TL;DR.

Three sub-decisions, each of which could reasonably have gone the other way:

1. **Scope: plugins that DECLARE codex.** The signal is `library.json`'s `agent-targets`, matching `per-target-presence`, rather than the presence of a `.codex-plugin/plugin.json` on disk. The declaration is the author's stated intent; the manifest is an artifact that may or may not have been regenerated. A Claude-only plugin's large command is not a defect of any kind, and reporting one would be the house imposing a foreign vendor's constraint on a plugin that never opted in.

2. **Measurement: the source file, declared as a proxy.** Discussed above and in the check's docblock.

3. **Severity: `warn`, capped to `0.17`.** Consistent with every other check this project has introduced since 0.12, and additionally required here by the proxy.

## Consequences

**The spine moves from 34 to 35.** Seventeen spine claims across eleven governed files went stale in the same change and were repaired in it; `scripts/check-doc-enumerations.mjs` names each one, which is why this ripple is a mechanical task rather than a hunt.

**A dated vendor read now has a home and an expiry.** The cap is recorded in `foundation/sources/codex.md` with the file path and the commit it was read at. It is a source read rather than a ledger claim: the fact lives in source code rather than on a documentation page, so the `quote` mechanism has nothing to re-fetch. It therefore does not age-block a release, and it also does not re-verify itself - the next Codex survey must re-read it, and the source record says so.

**A false positive is possible and bounded.** A command whose source exceeds 4000 bytes but whose rendered skill does not will warn without a defect behind it. The bound is the size of the frontmatter delta, which is tens of bytes against a 4000-byte cap, and the finding is a warn that names the proxy.

**A false negative is possible in the same band and is the reason for the warn wording.** A command just under the cap whose generated description pushes the rendered skill over it is not reported. The message tells an author near the boundary to check rather than to relax.
