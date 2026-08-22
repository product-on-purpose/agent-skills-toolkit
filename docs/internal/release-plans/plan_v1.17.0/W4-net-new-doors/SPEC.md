# W4 - The two net-new doors, and the how-to that closes a real gap

**Input to the implementation, not the implementation.** This states what W4 must deliver and what evidence already exists for each piece, so the pages can be written as execution rather than as discovery.

**W4 is sequenced FIRST** among the content workstreams. It is the only one whose material cannot be validated by reading an existing page, so it is where a wrong assumption is most expensive and where finding out late costs the most.

## What W4 delivers

| Artifact | Kind | Why it is here |
| --- | --- | --- |
| `docs/how-to/grade-in-ci.md` | **Public how-to, net-new** | Closes a capability gap, not a discoverability one. Decision 4, 2026-08-20 |
| `docs/adoption/door-6-stop-it-silently-breaking.md` | Runbook, net-new | The job. Wraps the how-to above |
| `docs/adoption/door-7-run-it-like-a-product.md` | Runbook, net-new composite | Narrative over five existing how-tos |
| One line in `README.md` where the CLI lane is introduced | Cross-link | So the Action is reachable from the front door, not only from the funnel |

## The finding this workstream exists to fix

**The toolkit ships a first-class GitHub Action that appears publicly nowhere.**

Verified by reading `action.yml` rather than assuming. Its real surface:

| `inputs` | What it does |
| --- | --- |
| `path` | plugin directory to grade, relative to the workspace |
| `profile` | named severity profile, passed through as `--profile` |
| `strict` | grade against the full live spine instead of the plugin's pinned Standard |
| `fail-on-error` | fail the step on a gate-failing error at the declared tier |
| `annotations` | emit `::error` / `::warning` annotations inline on the diff (`--gha`) |
| `sarif` | write a SARIF 2.1.0 document and expose its path |
| `node-version` | Node version to set up for the gate |

| `outputs` | What a workflow can branch on |
| --- | --- |
| `tier` | `"universal"` / `"convergent"` / `"advanced"` / `"none"` |
| `errors` | gate-failing error count at the declared tier |
| `warnings` | warning count |
| `sarif-path` | path to the SARIF document when `sarif: true`, empty otherwise |

**Searching the public docs tree, `README.md` and `QUICKSTART.md` for `action.yml`, `uses: product-on-purpose`, or SARIF returns hits only in `docs/internal/` and `docs/explanation/comparison.md`.** The sole public CI content is four lines in `how-to/install-and-run-via-npm.md` showing `npx agent-skills-toolkit .`.

**So this is a capability that is shipped, tested, gated on, and undiscoverable.** That is the funnel's whole thesis found in this repository's own corpus, which is why decision 4 makes the how-to unconditional: **it is worth writing whether or not the funnel ships**, and it means door 6 wraps a real page instead of becoming the Action's only documentation.

## The split between the how-to and the runbook, and why it matters

**They are different genres and must not merge.**

- **`docs/how-to/grade-in-ci.md` documents the mechanism.** Every input, every output, what SARIF gives you, what the pinning model is. It answers "how does this thing work?" and it is the page a reader lands on from a search engine.
- **`door-6` documents the job.** It answers "how do I stop this silently breaking?" and it sequences the mechanism into an adoption ramp with verify steps and outcome statements.

**The runbook links the how-to; it never restates it.** A funnel that forks the corpus doubles the maintenance and halves the trust, and this pair is the most likely place in the release for that to happen, because the net-new how-to and the net-new runbook are being written at the same time by the same person.

## D1 - The four-stage ramp, and why door 6 does not open with a red build

The prototype at `_local/onboarding/prototypes/runbook-gate-in-ci.md` establishes the ramp and it is ratified here rather than re-derived:

| Stage | What it does | Time | Why it is not stage 1 material |
| --- | --- | --- | --- |
| 1 | **Report, do not block.** `fail-on-error: false`, `annotations: true` | 10 min | - |
| 2 | **Block on errors**, after a week of watching | 5 min | A team that meets the gate as a red build meets it as an enemy |
| 3 | **Send findings to the Security tab** via SARIF | 5 min | Needs stage 2's trust before anyone will look |
| 4 | **Make it a required check** | 5 min | Irreversible socially, if not technically |

**The ramp is the content.** Anyone can paste a workflow file; the thing an adopter cannot get anywhere else is the sequencing that keeps a new gate from being switched off in its first week. **A door 6 that opens with a blocking gate is a door that gets closed.**

## D2 - The pinning model must be stated, not demonstrated by accident

`action.yml`'s own header example reads `uses: product-on-purpose/agent-skills-toolkit@v1.15.0` with the comment "pin a released tag or a commit sha".

**Two things follow, and the how-to must say both.**

1. **The example version in a published page is a claim that ages.** It is correct today (v1.15.0 is released, on npm `latest`, with SLSA provenance). It will be wrong the moment a reader copies it a year from now and gets a stale gate without knowing.
2. **So the page states the pinning POLICY and shows the syntax**, rather than presenting one version as the answer. A reader who understands "pin a released tag or a sha, and here is how to find the current one" is served forever; a reader handed `@v1.15.0` is served until the next minor.

**This is the repository's own `action-pins` gate reasoning pointed at its own documentation.** A pin label is a claim, per ADR 0053 (a pin label is a claim, and behind is not a defect). A pin printed in a how-to is the same kind of claim with none of the enforcement.

## D3 - Door 7 is a narrative, and its five sources already exist

All five verified present:

`docs/how-to/manage-the-backlog.md`, `record-a-decision.md`, `cut-a-release.md`, `deprecate-a-component.md`, `manage-templates.md`.

**So door 7 writes no mechanism.** Its net-new content is the thing none of the five can supply: the order they go in, why a team reaches for each one, and what "running a plugin like a product" means as a practice rather than as five procedures. **If door 7 ends up explaining how to cut a release, it has been written wrong.**

## Acceptance for W4

Each able to fail.

1. **`docs/how-to/grade-in-ci.md` exists, and its stage 1 workflow was run in a real repository**, producing at least one inline annotation visible on a diff. **Demonstrated, not described.**
2. **The stage 3 SARIF path was run in a real repository** and the finding is visible in the Security tab. This is the claim most likely to be written from the schema rather than from a run, and the one whose failure would be least visible.
3. **Every `inputs` and `outputs` key in `action.yml` appears in the how-to**, or is deliberately omitted with the reason recorded here. A partial reference reads as a complete one.
4. **The how-to states the pinning policy and does not present a single version as the answer.** Grep-checkable: no bare `@v1.17.0`-style pin appears without the surrounding policy sentence.
5. **Door 6 links the how-to and does not restate its mechanism.** Checkable by reading: if a stage's instructions are complete without the how-to, they have been duplicated.
6. **Door 7 names all five source how-tos and adds no sixth procedure.**
7. **Both doors carry the full seven-section anatomy**, including a `YOU CAN NOW` section whose statements were verified true in a scratch repository.

## What W4 does NOT decide

- **Whether the Action gains new inputs or outputs.** Documenting a capability is not the moment to extend it. Anything the writing exposes as missing is a backlog entry, not a scope addition.
- **Whether `install-and-run-via-npm.md`'s four CI lines are removed.** They are correct as far as they go. Whether they become a pointer to the new how-to is a W5 cross-link question, and removing correct content to make room for new content is how a corpus loses information.
- **Any change to `action-pins` or to the gate.** This workstream writes documentation and runs the Action; it does not touch it.
