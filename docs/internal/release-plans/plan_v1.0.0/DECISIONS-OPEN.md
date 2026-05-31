# agent-skills-toolkit - Decisions Log

> **All seven maintainer decisions DECIDED 2026-05-26** (v0.2). Full briefs for the questions surfaced in [`RELEASE-PLAN.md`](./RELEASE-PLAN.md) Section 6, plus Q-G (PM/execution layer). Index: [`README.md`](./README.md).
> Status convention: **OPEN** (awaiting maintainer) · **DECIDED** (choice + date recorded) · **DEFERRED** (to a named phase/plan).
> When the repo's `decision` skill exists (Phase 4), DECIDED items here graduate into numbered MADR ADRs under `docs/internal/decisions/` (dogfooding the skill - see Q-C).

Each decision: **Context** (why it matters / what it affects) · **Desired outcome** (what good looks like) · **Options** (with tradeoffs) · **Recommendation** · **Decision** · **Status**.

---

## Q-A - Public Silver preview after Phase 3? (highest leverage)

**Context.** v1 is the maximal-ambition path (comprehensive scope + Gold self-hosting). The original strategy brief warned of over-scope/burnout (risk R6). The monotonic-tier model makes Phase 3 produce an honest, valuable artifact: a Silver plugin that builds components and emits to both Claude and Codex. Question: does the world see it at Silver, or only at Gold v1.0.0?

**Desired outcome.** Validate real demand *before* investing in the expensive Gold tail; avoid building comprehensively in a vacuum.

**Options.**
- **A - Public 0.x preview + marketplace listing at Silver.** Earliest/broadest signal. Cost: supporting users on a pre-Gold tool; spends the marketplace debut on an unfinished product.
- **B - Stay private until Gold v1.0.0.** One clean, fully self-proving launch; strongest first impression. Cost: zero external signal until the most expensive work is done - maximum scope risk.
- **C - Public repo + labeled `0.x` preview tag at Silver; reserve marketplace registration for Gold v1.0.0.** Early adopters use it via the repo; marketplace debut stays clean for Gold. Honors D8 by treating the Gold tag as the marketplace-launch tag.

**Recommendation: C.** Captures A's de-risking (feedback at the natural Phase 3 cut point - cheapest insurance against R6) while preserving B's clean marketplace debut.

**Decision: C (2026-05-26).** Repo stays private through Phases 0-2; at Phase 3 exit, flip the repo public and tag a labeled `0.x` preview; reserve marketplace registration for the Gold `v1.0.0` tag. The private GitHub issue tracker built now becomes the public roadmap on the visibility flip.

**Status:** DECIDED.

---

## Q-B - `init-marketplace` in v1, or fast-follow?

**Context.** `init-marketplace` scaffolds a *separate* catalog. The marketplace-separation rule makes it the least-coupled v1 skill - nothing depends on it. It is small.

**Desired outcome.** Complete the build->govern->distribute story without bloating the critical path.

**Options.**
- **A - Keep in v1 (Phase 4).** Completes the end-to-end story; Phase 5's own marketplace registration can dogfood it.
- **B - Defer to v1.1.** Trims the critical path; marketplace creation is a rare, once-per-workspace action.

**Recommendation: A, but flag it as the first thing to cut.**

**Decision: A (2026-05-26).** Keep `init-marketplace` in v1 (Phase 4). It is explicitly the first scope to cut if Phase 4 runs long, since it is genuinely separable.

**Status:** DECIDED.

---

## Q-C - Where does the committed design record live?

**Context.** On promotion to git, `STANDARD.md` goes to repo root. Where does the DESIGN doc (vision + the D1-D19 decision record) live?

**Desired outcome.** Clean root surface; design rationale discoverable by maintainers; consistent with the governance-layout rule (committed maintainer governance under `docs/internal/`, Standard §10.4).

**Options.**
- **A - `docs/internal/` as a single design record.** Keeps root clean; matches §10.4.
- **B - Root `DESIGN.md`.** Maximally discoverable; clutters root; not in the Standard's anatomy.
- **C - Decompose into numbered ADRs under `docs/internal/decisions/`.** D1-D19 map almost 1:1 to ADRs; most faithful to MADR governance.

**Recommendation: A now, C as the target.**

**Decision: A now, C later (2026-05-26).** At Phase 0, drop the consolidated DESIGN into `docs/internal/` (fast, clean root). Once the `decision` skill exists (Phase 4), dogfood it to decompose D1-D19 into numbered ADRs under `docs/internal/decisions/`.

**Status:** DECIDED.

---

## Q-D - Wrap `skills-ref`, or reimplement agentskills validation in Node?

**Context.** The Universal tier requires skills pass `skills-ref`-equivalent validation. Phase 1's validator either shells out to `skills-ref` or reimplements its checks. Collides with the "single runtime, no triplets, CI-agnostic" stack decision.

**Desired outcome.** Reliable agentskills validation that tracks the spec without dragging in a second runtime.

**Options.**
- **A - Wrap `skills-ref`.** Authoritative, auto-tracks the spec, less code. Cost: external dep in CI; coupling to its CLI/output; *if not Node*, violates "single runtime."
- **B - Reimplement in Node.** Single runtime, no dep, full control. Cost: duplicates the reference; track spec changes by hand.
- **C - Thin adapter over `skills-ref` + Node fallback.** Best of both; two code paths.

**Recommendation: contingent on `skills-ref`'s runtime (a quick Phase 1 research task).**

**Decision: research-gated (2026-05-26).** At Phase 1 start, research `skills-ref`'s implementation runtime. If Node/npm-installable -> wrap it behind a thin swappable adapter (A). If Python/Rust/other -> reimplement the checks in Node (B), since a second runtime breaks the stack decision. The agentskills checks are small/well-specified, so reimplementing is cheap insurance.

**Status:** DECIDED (resolution research-gated at Phase 1 start).

---

## Q-E - Real Codex CLI in CI, or structural validation only?

**Context.** Silver self-validation includes emitting Codex artifacts and checking them. Strongest = run the real Codex CLI in CI (round-trip: does Codex load what we emitted?). Weaker = structural validation of the emitted files.

**Desired outcome.** Confidence the emitted Codex artifacts actually work, not just look right, without a brittle/expensive CI.

**Options.**
- **A - Real Codex CLI round-trip in CI.** Strongest proof; catches drift against the real tool. Cost: Codex CLI installable + authenticated in CI (secrets in a public repo's CI, possible API cost, complexity).
- **B - Structural validation only.** Simple, deterministic, no secrets/cost. Cost: validates shape, not behavior.
- **C - Structural in CI (the gate) + manual round-trip at release time** (and during the Phase 3 Codex spike, R2).

**Recommendation: C.**

**Decision: C (2026-05-26).** Structural validation is the deterministic CI gate (no secrets/cost). A documented manual Codex round-trip runs before each tagged release, and the mandatory Phase 3 Codex spike (R2) catches real format issues early. Upgrade to A only if Codex later offers a cheap offline/no-auth validate mode.

**Status:** DECIDED.

---

## Q-F - Which hooks does the toolkit itself ship (for Gold G1)?

**Context.** G1 requires documented hooks. For the self-hosting proof to be meaningful (not token), the toolkit's own hooks should be genuinely useful - the toolkit as exemplar of advanced-tier practice.

**Desired outcome.** 1-3 real, useful hooks that satisfy G1 and demonstrate best-practice hook authoring.

**Options (candidate hooks).**
- **H1 - PreToolUse guard blocking hand-edits to generated files** (`INDEX.md`, manifests). Makes G4's "no hand-editing generated files" self-enforcing. Mechanically identical to the maintainer's existing `no-em-dashes.py` PreToolUse hook (deny + reason).
- **H2 - PostToolUse validator on component edits** (edit a `SKILL.md` -> frontmatter/description check runs via the portable scripts). Demonstrates local/CI parity.
- **H3 - SessionStart hook surfacing the current `tier-report`** (orienting context). Pure observer.
- **H4 - Stop/SubagentStop hook** (no compelling use found).

**Recommendation: H1 + H2, optionally H3.**

**Decision: H1 + H2 core, H3 optional - PROVISIONAL (2026-05-26).** This is a Phase 5 build decision; the generated-file set and validator interfaces will be better understood by then. Provisional default recorded: ship H1 (the marquee self-enforcement demo) + H2 (parity proof), with H3 as a cheap optional nicety. Skip H4. Revisit at Phase 5 when these are actually authored.

**Status:** DECIDED (provisional; revisit at Phase 5).

---

## Q-G - PM / execution layer: how do we run the build, and how does work reach Claude?

**Context.** The maintainer wants a more systematic, scalable approach than past projects: a GUI layer, a referenceable timeline/continuation process, and the ability to assign/drive work from GitHub. The repo (`product-on-purpose/agent-skills-toolkit`) already exists, is **private**, has Issues + Projects enabled, and contains only an initial `README.md`. The RELEASE-PLAN already decomposes the work (6 phases, each with a `Ships:` checklist and exit gate), so the structure to project into a tracker already exists.

**Desired outcome.** A queryable, GUI-visible execution surface with spec traceability, that scales to parallel work at Phase 3+, bills automated runs against the Claude Max plan, and complements (not replaces) the existing session-log + tier-report timelines.

**Options.**
- **A - Native GitHub only.** Issues + Milestones + Projects board + `@claude` mentions throughout. Simplest, no third-party coupling. Cost: no built-in parallel-agent orchestration for the 8-builder Phase 3-4.
- **B - ccpm from the start.** Adopt the PRD->epic->task->code model from Phase 0. More traceability/structure immediately. Cost: ceremony tax on the strictly-sequential, solo Phases 0-2; its PRD-up-front model lightly conflicts with the deliberate "defer file-level plans" decision.
- **C - Hybrid.** Native GitHub now (Milestones = phases, Issues = `Ships:` items, Projects board = the GUI, work driven via `@claude` comment-mentions billed to Max via `CLAUDE_CODE_OAUTH_TOKEN`); trial ccpm's worktree parallelism at Phase 3, where the 8 builders make parallel agents pay off.

**Recommendation: C.** Native covers Phases 0-2 with zero overhead and gives the GUI (Projects) + timeline (issues) immediately; ccpm is added exactly where its parallelism earns its ceremony.

**Decision: C - Hybrid (2026-05-26).** Stand up the native GitHub substrate now while private; map Milestones=phases, Issues=`Ships:` items, a repo Project board as the GUI. Drive automated work via `@claude` mentions on the Claude GitHub App, authenticated with a Max-subscription OAuth token (`claude setup-token` -> `CLAUDE_CODE_OAUTH_TOKEN` secret; no `ANTHROPIC_API_KEY`). Trial ccpm at Phase 3. Traceability convention (LOCKED): **every work issue links upward to STANDARD requirement IDs + RELEASE-PLAN phase + the per-phase plan section.**

**Implementation notes / caveats.**
- Setup via `/install-github-app` in the Claude Code CLI.
- Trigger is `@claude` **comment-mentions**, not issue assignment.
- As of 2026-06-15, non-interactive usage (which includes GitHub Actions runs) draws from a separate monthly Agent SDK credit on subscription plans, not the interactive Max budget. Plan Phase 3-4's heavy automated runs around that.

**Status:** DECIDED.

---

## Implementation-detail questions (DEFERRED to per-phase plans)

These do not need a maintainer call now; resolved when each phase's plan is written, with these leans:

| Q | Phase | Lean |
|---|---|---|
| Q1.2 Node test runner | 1 | `node:test` (zero-dep, fits "single runtime") |
| Q1.3 `manifest.generated.json` vs `library.json` | 1 | generated = resolved/expanded index; `library.json` = authored SoT |
| Q2.1 `--improve` coupling to `evaluate` | 2 | consume `evaluate`'s machine report (DRY + dogfoods evaluate) |
| Q2.2 `skill-author` interview-vs-inference depth | 2 | decide in the per-component plan |
| Q3.1 2nd builder (extract shared harness) | 3 | `build-subagent` |
| Q3.3 `build-mcp` validation depth | 3 | server definition + registration emission only for v1 |
| Q4.2 `capability-advisor` scope | 4 | recommender only (does not invoke builders) |
| Q0.1 design-record location | 0 | = Q-C (docs/internal now) |
| Q0.2 repo/marketplace slug | 0 | `agent-skills-toolkit` (confirmed - repo exists) |

---

## One-line decision summary
**Q-A:** C, public Silver preview via repo tag, marketplace at Gold · **Q-B:** keep `init-marketplace`, first to cut · **Q-C:** docs/internal now, ADRs at Phase 4 · **Q-D:** research `skills-ref` runtime at Phase 1, then wrap-or-reimplement · **Q-E:** structural CI + manual round-trip · **Q-F:** H1 + H2 (+H3 optional), provisional, revisit Phase 5 · **Q-G:** hybrid - native GitHub now (issues/milestones/Projects + @claude on Max), ccpm at Phase 3.

## Change log
- 2026-05-26 v0.2: All seven decisions DECIDED. Added Q-G (PM/execution layer = hybrid native-GitHub-now + ccpm-at-Phase-3, with @claude-via-Max execution and the locked upward-traceability convention). Q-A..Q-F resolved per recommendations (Q-D research-gated, Q-F provisional/Phase-5).
- 2026-05-25 v0.1: Captured full briefs for the six maintainer decisions (Q-A..Q-F) + deferred implementation-detail questions. All OPEN pending maintainer decision.
