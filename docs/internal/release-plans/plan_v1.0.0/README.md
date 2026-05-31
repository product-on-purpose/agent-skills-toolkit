# agent-skills-toolkit - working docs index

> The frozen **v1.0.0 planning snapshot**, committed under `docs/internal/release-plans/plan_v1.0.0/`. This index classifies every doc by status. The canonical normative Standard is the repo-root [`STANDARD.md`](../../../STANDARD.md) (v0.8) and the canonical design record is [`docs/internal/DESIGN.md`](../../DESIGN.md); the `STANDARD.draft.md` and `agent-skills-toolkit-DESIGN.md` in this folder are superseded historical drafts kept for provenance. The live plan is [`RELEASE-PLAN.md`](./RELEASE-PLAN.md) (v0.2) and live status is [`docs/internal/STATUS.md`](../../STATUS.md). Updated 2026-05-30.

## Read order

This bundle is a historical snapshot. For current truth, read the committed canon first:
1. **Repo-root [`STANDARD.md`](../../../STANDARD.md)** (v0.8) - the normative Standard.
2. **[`docs/internal/DESIGN.md`](../../DESIGN.md)** - the consolidated design + decision record.
3. **[`RELEASE-PLAN.md`](./RELEASE-PLAN.md)** (v0.2) + **[`STATUS.md`](../../STATUS.md)** - the live plan and status.

Within this snapshot, `agent-skills-toolkit-DESIGN.md` and `STANDARD.draft.md` are SUPERSEDED drafts; everything else is supporting, secondary, or archival provenance.

## Classification

### Historical drafts (SUPERSEDED - prefer the committed canon)
| Doc | Role | Version | Superseded by |
|---|---|---|---|
| `agent-skills-toolkit-DESIGN.md` | The consolidated design master at snapshot time. | v0.8 | `docs/internal/DESIGN.md` |
| `STANDARD.draft.md` | The Standard draft (already promoted; provenance only). | v0.7 | repo-root `STANDARD.md` v0.8 |

If anything in this snapshot disagrees with the committed `STANDARD.md` / `DESIGN.md` / `RELEASE-PLAN.md` v0.2, **the committed canon wins.**

### Planning (active, drives execution)
| Doc | Role |
|---|---|
| `RELEASE-PLAN.md` | The v1 phased program plan: 6 phases (0-5), the milestone-validity model (resolves F-07), the self-hosting bootstrap resolution, risks, and 6 maintainer decisions. Per-phase implementation plans get generated from this when each phase starts. |
| `DECISIONS-OPEN.md` | Full briefs for the 7 maintainer decisions (Q-A..Q-G, **all DECIDED 2026-05-26**, v0.2) - context / options / recommendation / decision. Canonical for those decisions; graduates to MADR ADRs at Phase 4. Q-G added this session = the PM/execution layer (hybrid native-GitHub + ccpm-at-Phase-3). |

### Secondary (active reference, not canonical)
| Doc | Role |
|---|---|
| `builder-skills-catalog.md` | The full roadmap inventory (~60 candidate builder skills). The DESIGN doc defines the v1 subset + final naming; the catalog is the longer-horizon menu. Some entries use older names. |

### Session logs (point-in-time records - do not edit)
| Doc | Role |
|---|---|
| `2026-05-26_10-02_claude_decisions-locked-github-scaffold.md` | **Latest.** Deep log: all 7 decisions locked (Q-A..Q-G), GitHub PM substrate stood up (milestones, board #3, Phase 0 issues #1-#7). Has the resume prompt for Phase 0 execution. |
| `2026-05-25_22-21_claude_design-finalize-codex-review-release-plan.md` | Deep log: design finalization, two-axis terminology, Codex format research, 2nd Codex review, release plan, open decisions. |
| `2026-05-25_00-33_claude_agent-skills-toolkit-design.md` | Earlier deep log: initial design work + the first Codex adversarial review (verbatim) + triage. |

### Archival (`archive/` - provenance only, superseded)
| Doc | Role | Superseded by |
|---|---|---|
| `archive/decision-guide.md` | The decision-journey record (how we reached the decisions). | DESIGN |
| `archive/foundation-and-decisions.md` | Detailed decision log with both parties' feedback. | DESIGN |
| `archive/architectural-approach.md` | The A/B/C architecture comparison (Approach B chosen). | DESIGN §4 |
| `archive/discovery-integration.md` | One-time gap analysis of the three prior discovery docs. | DESIGN (folded in) |

### Raw discovery inputs (`../initial-discovery/`)
The original source material that seeded the project: the ChatGPT architecture guide, the Claude strategy brief, the discovery-questions set, AI-chat transcripts, and infographics. Inputs, not decisions.

## Terminology note (applies to ALL older docs)

The canonical docs use a **strict two-axis vocabulary** that the archival/secondary docs predate:
- **Structure:** *component* (unit of reuse) < *plugin* (unit of release, holds the one version) < *workspace*; a *marketplace* catalogs plugins.
- **Quality:** *skill library* = a plugin that conforms to the Standard, graded Bronze/Silver/Gold. A **grade, not a separate artifact.**

Older docs often use "library" loosely (as if it were the package). **Where an archived/secondary doc says "library" structurally, read "plugin."** See DESIGN §1 / STANDARD §0 for the authoritative definitions.
