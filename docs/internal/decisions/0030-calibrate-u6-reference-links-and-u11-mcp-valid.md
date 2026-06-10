# 0030 - Calibrate U6 (reference-links) and U11 (mcp-valid) from the batch-2 corpus run

## TL;DR
- **Decision:** Two grading calibrations found by the second eval-target corpus run. `U6` (reference-links) now strips fenced code blocks before scanning and skips non-filesystem URI schemes (`computer:`, `file:`, `ftp:`, `ws:`/`wss:`, `tel:`, `data:`, `javascript:`, protocol-relative `//`), mirroring the fence and `SKIP_SCHEME` handling `scripts/gen-docs-site.mjs` already uses in-repo: a markdown link inside an illustrative fenced example, or a non-relative scheme, is no longer reported as a dangling reference. `U11` (mcp-valid) now treats a typed http server with an empty or absent url as the managed-connector pattern (the host supplies the endpoint at runtime) and reports it as a WARNING, not a tier-blocking error; a genuinely underspecified server (no type, no command, no url) stays an error. Both checks keep `objective` provenance and still catch real defects. Spine stays 29; Standard stays 0.11.
- **Why:** The batch-2 corpus run pointed the gate at the official Anthropic plugin set, and both checks fired on well-built official targets on convention, not defect. `U6` errored on example links embedded in fenced SKILL.md illustrations (5 on `claude-code-setup`, 2 on `plugin-dev`) and on the Cowork `computer://` scheme; `U11` errored on the `gmail` and `google calendar` managed connectors (`{"type":"http","url":""}`) that Anthropic's knowledge-work plugins ship suite-wide, blocking the tier on 12+ official plugins. Same illegitimacy ADR 0028 (U10) and ADR 0029 (U2/U5) corrected.
- **Status:** Accepted.

- **Status:** Accepted
- **Date:** 2026-06-10
- **Deciders:** maintainer (jprisant), with Claude (Opus 4.8)

## Builds on
- ADR 0028 (retire U10) and ADR 0029 (reclassify U2/U5) - the same legitimacy test: a check graded against a plugin you do not own must proxy a real, portable defect, not fail the platform author's own deliberate convention. This ADR applies it to two more checks the corpus exposed.
- The batch-2 eval-target corpus run, `_local/audit/anchor-runs/2026-06-10/FINDINGS.md` - the evidence (finding 1 for U6, finding 2 for U11), with before/after re-runs.
- ADR 0027 (Standard versioning and compatibility policy) - these are grading calibrations of HOW two checks fire, not changes to WHAT the Standard requires (a real dangling link is still a U6 error; a malformed or self-contained-but-broken MCP server is still a U11 error), so no spine change, no Standard version bump, and no warn-then-error burndown.

## Context and problem statement
The batch-2 corpus run graded the official anchors (`anthropics/knowledge-work-plugins`, `anthropics/claude-code` `/plugins`, `anthropics/claude-plugins-official`) and four community marketplaces under `--profile plain-plugin`. The gate was well-calibrated on official targets overall (A4 12/12, A3 32/36 clean), but two objective checks produced systematic false positives:

- **U6 (`reference-links`)** scans markdown links with a regex that does not strip fenced code blocks, and skips only `https?:`/`mailto:`/`#`. So an illustrative `[the template](openapi-template.yaml)` inside a fenced `yaml` example block, the Cowork `computer:///...` scheme, and `file:///...` placeholders are all treated as dangling relative links. Evidence: `claude-code-setup` (5 errors, all example links inside a fenced reference doc), `plugin-dev` (2), `sales` (the `computer://` plus template-placeholder links).
- **U11 (`mcp-valid`)** requires every http server to declare a valid http(s) url, and `new URL("")` throws. Anthropic's official knowledge-work plugins ship `gmail` and `google calendar` as `{"type":"http","url":""}` managed connectors whose endpoint Claude Cowork supplies at runtime; U11 errored and blocked the tier on this deliberate, suite-wide official pattern (12+ of 17 plugins, including the `product-management` baseline).

## Decision drivers
- Legitimacy (the ADR 0028/0029 test): neither a link inside a code example nor a host-resolved managed connector is a portable defect; erroring on them fails well-built official plugins on convention.
- Reuse over re-derivation: `gen-docs-site.mjs` already implements both halves of the U6 fix (fence tracking plus a `SKIP_SCHEME` allowlist); U6 should borrow the same behavior rather than diverge.
- Surgical, not blunt: a real dangling link OUTSIDE a fence, and a genuinely malformed MCP server, must still error. The fix strips only fenced content and warns only the typed-http-empty-url shape.
- No conformance churn beyond the intended calibration: the toolkit's own Gold self-grade stays Advanced 0/0; the spine and Standard version are untouched.

## Considered options
1. **Strip fences plus broaden the U6 scheme allowlist; warn (not error) the U11 managed-connector shape.** (chosen) Borrows the in-repo `gen-docs-site` precedent for U6; recognizes the official managed-connector pattern for U11 while keeping underspecified servers an error. TDD: failing tests first (fenced link ignored, `computer://`/`file://` ignored, broken link outside a fence still caught; managed connector warns, present-but-invalid url still errors), then minimal code.
2. **Reclassify U6/U11 to house and drop them under plain-plugin (the ADR 0029 move).** Rejected: both checks DO proxy real, portable defects (a genuinely dangling reference; a malformed or credential-leaking MCP server). The problem is false positives, not illegitimate provenance. Reclassifying would stop grading real link-rot and real broken servers on third-party plugins, which is worse than fixing the precision.
3. **Special-case only the exact schemes/pattern seen (`computer://`, `gmail`/`google calendar`).** Rejected as too narrow: the fence false positive is structural (any fenced example link), and the scheme set should match the documented `gen-docs` allowlist, not a hand-picked pair.
4. **Leave as-is.** Rejected: the default outward-grading experience on official plugins is dominated by these two false positives - the exact friction the corpus exists to find and the `--profile` work set out to remove.

## Decision outcome
Option 1. `scripts/checks/reference-links.mjs` gains a `stripFences()` applied before link scanning and a `SKIP_SCHEME` allowlist (the `gen-docs-site` set plus `computer:` and `file:`); `scripts/checks/mcp-valid.mjs` reports a typed-http server with an empty or absent url as `SEVERITY.WARN` (managed connector) rather than an error, keeping the underspecified-server and secret-inlining errors. `tests/unit/reference-links.test.mjs` (+3) and `tests/unit/mcp-valid.test.mjs` (+2) add the calibration tests. Suite 358 -> 363; gate Advanced 0/0; spine 29; Standard 0.11. Verified against the corpus: the A2 knowledge-work cohort goes from 14/17 plugins with errors to 17/17 error-free (the connectors now warn), `claude-code-setup` 5 errors -> 0, `plugin-dev` 2 -> 0 (its real over-500-line U7 warnings kept), `sales` 6 -> 0.

## Consequences
- **Positive:** the gate stops failing well-built official plugins on a fenced example link or a managed connector; outward grading under plain-plugin is honest (errors are real defects); U6's behavior now matches the in-repo `gen-docs-site` link handling, removing a divergence.
- **Negative:** U6 no longer flags a dangling link that exists only inside a fenced code block (acceptable: a link in an illustration is not a live reference), and U11 no longer errors on an empty-url http server (mitigated: it warns, the askit-library profile still surfaces it, and a self-contained server that needs a url is told so).
- **Follow-up (not in this change):** the batch-2 run also flagged the plain-plugin tier label overstating ("Advanced" for an incomplete package) and the U3/U4 base-spec-vs-Claude-Code name question; both are recorded in the FINDINGS doc as separate decisions. The C4 165-error scope-detection outlier and the C1 layout re-point are open observations.
