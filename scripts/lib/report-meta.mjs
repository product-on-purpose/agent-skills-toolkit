// what-it-is:   the per-requirement explanation table for the evaluation report renderer
// what-it-does: maps each reqId to its "why it matters", a copy-paste fix prompt, and an effort estimate
// why:          keeps human-facing remediation prose out of the deterministic check modules (the gate stays a thin linter, ADR 0028); one table the MD and HTML renderers share so they never diverge
// used-by:      scripts/lib/report-render.mjs
//
// One entry per reqId currently in the spine (U1-U9, U11-U12, S1-S8, G1-G10). The registry-coverage
// test in tests/unit/report-render.test.mjs fails CI if a future spine addition forgets its row, so a
// new check cannot ship with a blank "why". The `why` strings for U5/U7/G2/G3/G5 are lifted from the
// editorial sample's blockquotes; the rest are authored from each check's purpose and Standard clause.
// `<component>` in a fixPrompt is a placeholder the renderer fills from the finding's file where present.
export const REPORT_META = Object.freeze({
  U1: {
    why: "Without a valid library.json a tool cannot identify the library, its version, or the Standard it pins, so nothing downstream can grade, install, or emit it.",
    fixPrompt: "Use askit-build-settings to add or repair library.json with name, version, description, standard, and tier. Then run node scripts/check.mjs and confirm U1 passes.",
    effort: "~10 min",
  },
  U2: {
    why: "The agentskills.io anatomy (a root AGENTS.md and the standard component folders) is how any agent discovers what the library contains; a broken anatomy makes the library unreadable to the tools meant to load it.",
    fixPrompt: "Use askit-init-plugin to scaffold the missing agentskills.io anatomy (a root AGENTS.md and the standard skills/ agents/ commands/ folders). Then run node scripts/check.mjs and confirm U2 passes.",
    effort: "~15 min",
  },
  U3: {
    why: "A component whose frontmatter does not parse, or lacks a name or description, cannot be loaded or selected by an agent; the parse is the contract between the file and the runtime.",
    fixPrompt: "Use askit-build-skill (improve mode) on <component>: repair the SKILL.md frontmatter so it parses and carries a name and a description. Then run node scripts/check.mjs and confirm U3 passes.",
    effort: "~10 min",
  },
  U4: {
    why: "When a component's declared name does not match its directory, references and manifests point at the wrong place; a kebab-case directory that equals the name keeps lookups unambiguous across agents.",
    fixPrompt: "Use askit-build-skill (improve mode) on <component>: make the component name equal its directory in kebab-case. Then run node scripts/check.mjs and confirm U4 passes.",
    effort: "~10 min",
  },
  U5: {
    why: "A description below the clarity bar makes a skill hard for an agent to select for the right job; it may fail to fire when it should, or fire when it should not.",
    fixPrompt: "Use askit-build-skill (improve mode) on <component>: rewrite the description to state the concrete action and the use-when trigger with real keywords, no colon-space, under 1024 chars. Then run node scripts/check.mjs and confirm U5 scores at or above the bar.",
    effort: "~10 min",
  },
  U6: {
    why: "A reference link that does not resolve sends the agent to a missing file mid-task, breaking progressive disclosure exactly when the detail is needed.",
    fixPrompt: "Use askit-build-skill (improve mode) on <component>: fix or remove the broken references/ link so every reference resolves. Then run node scripts/check.mjs and confirm U6 passes.",
    effort: "~10 min",
  },
  U7: {
    why: "A body over the instruction budget risks the model dropping its later steps, so the exact step that differentiates the skill can be the one lost at runtime.",
    fixPrompt: "Use askit-build-skill (improve mode) on <component>: extract the longest section into references/ and point to it with a progressive-disclosure pointer, bringing the body under the budget. Then run node scripts/check.mjs and confirm U7 no longer warns.",
    effort: "~10 min",
  },
  U8: {
    why: "When a native manifest disagrees with library.json, the agent loads something other than what the library declares; generated (not hand-edited) manifests are what keep the two in lockstep.",
    fixPrompt: "Regenerate the native manifests so they match library.json (never hand-edit them): run node scripts/generators/gen-manifest.mjs . --write --target=all. Then run node scripts/check.mjs and confirm U8 passes.",
    effort: "~5 min",
  },
  U9: {
    why: "When a component version disagrees with library.json, release tooling and consumers cannot tell which version they actually have; the versions must agree to make a release honest.",
    fixPrompt: "Use askit-release (version mode) to align every component version with library.json. Then run node scripts/check.mjs and confirm U9 passes.",
    effort: "~5 min",
  },
  U11: {
    why: "An MCP server definition that is malformed or carries an inline secret either fails to connect or leaks a credential into the repository; validating it keeps the integration safe and loadable.",
    fixPrompt: "Use askit-build-mcp (improve mode) on <component>: repair the MCP server definition and move any inline secret to an env reference. Then run node scripts/check.mjs and confirm U11 passes.",
    effort: "~15 min",
  },
  U12: {
    why: "A mermaid diagram that does not parse renders as a broken block in the docs and the docs site, so a diagram meant to explain the library instead signals it is unmaintained.",
    fixPrompt: "Use askit-build-docs (improve mode): fix the mermaid block so it parses (the toolkit validates every fenced mermaid diagram). Then run node scripts/check.mjs and confirm U12 passes.",
    effort: "~10 min",
  },
  S1: {
    why: "Without a declared agent-targets list the library does not say which agents it converges across, so the Convergent guarantees (matching manifests, per-target presence) have nothing to check against.",
    fixPrompt: "Use askit-init-plugin (or edit library.json) to declare agent-targets, for example claude and codex. Then run node scripts/check.mjs and confirm S1 passes.",
    effort: "~5 min",
  },
  S2: {
    why: "A consistent prefix is how a multi-skill library avoids name collisions on a shared agent and signals which components belong to it; an unprefixed component is ambiguous once installed beside others.",
    fixPrompt: "Use askit-migrate to normalize every component to the library prefix. Then run node scripts/check.mjs and confirm S2 passes.",
    effort: "~15 min",
  },
  S3: {
    why: "When the components index does not list what is on disk, tools that read the index (install, emit, grade) miss real components or reference ones that do not exist.",
    fixPrompt: "Update library.json's components block to list exactly what is on disk. Use askit-init-plugin or askit-template-manager. Then run node scripts/check.mjs and confirm S3 passes.",
    effort: "~10 min",
  },
  S4: {
    why: "An orphan or phantom chain edge means a declared delegation points at nothing, or a real delegation is undeclared; the chain contract is what makes cross-component handoffs honest and reviewable.",
    fixPrompt: "Use askit-build-chain-contract to declare every real delegation in agents/_chain-permitted.yaml and remove any orphan or phantom edge. Then run node scripts/check.mjs and confirm S4 passes.",
    effort: "~15 min",
  },
  S5: {
    why: "A workflow step that references a skill which does not exist breaks the run at that step; validating the references keeps a multi-step workflow executable end to end.",
    fixPrompt: "Use askit-build-workflow to repair the workflow so every step references a skill that exists. Then run node scripts/check.mjs and confirm S5 passes.",
    effort: "~10 min",
  },
  S6: {
    why: "If a declared agent target is missing its native manifest, the library claims to converge on an agent it cannot actually load onto; per-target presence makes the cross-agent claim real.",
    fixPrompt: "Regenerate the native manifests for every declared target: run node scripts/generators/gen-manifest.mjs . --write --target=all. Then run node scripts/check.mjs and confirm S6 passes.",
    effort: "~5 min",
  },
  S7: {
    why: "A command that maps to zero or many skills is ambiguous at invocation; one command to exactly one skill keeps the slash entry point predictable.",
    fixPrompt: "Use askit-build-command on <component>: map the command to exactly one skill. Then run node scripts/check.mjs and confirm S7 passes.",
    effort: "~10 min",
  },
  S8: {
    why: "A one-way index lets the index and disk drift apart silently; mirroring in both directions catches both an orphan on disk and a phantom in the index.",
    fixPrompt: "Use askit-init-plugin (or regenerate the components index) so library.json mirrors disk in both directions, with no orphan and no phantom. Then run node scripts/check.mjs and confirm S8 passes.",
    effort: "~10 min",
  },
  G1: {
    why: "An undocumented hook changes the agent's behavior invisibly; documenting each hook is what lets a reviewer and a consumer see what fires and why before they install it.",
    fixPrompt: "Use askit-build-hook to document each hook (what it fires on and why) in the hooks reference. Then run node scripts/check.mjs and confirm G1 passes.",
    effort: "~10 min",
  },
  G2: {
    why: "Without CI running the gate, conformance is a claim, not a proof. Any change can silently regress the library, and a consumer cannot point to a green badge that says the standard held on the latest commit.",
    fixPrompt: "Use askit-build-settings (CI mode) on this plugin: add .github/workflows/ci.yml that checks out the repo, sets up Node, runs npm ci, then runs node scripts/check.mjs as a required step. Then run node scripts/check.mjs and confirm G2 passes.",
    effort: "~20 min",
  },
  G3: {
    why: "Chain edges are where delegation breaks quietly; a regression eval per edge turns the chain contract from a declaration into a tested guarantee that a refactor cannot sever unnoticed.",
    fixPrompt: "Use askit-build-samples to add a regression eval per uncovered chain edge (covers.chain set to the caller and callee, with at least one delegation case). Then run node scripts/check.mjs and confirm G3 reports no uncovered chains.",
    effort: "~30 min",
  },
  G4: {
    why: "A stale INDEX.md misrepresents the library to anyone reading the catalog; generating it and drift-checking in CI keeps the published index honest on every commit.",
    fixPrompt: "Regenerate INDEX.md: run node scripts/generators/gen-index.mjs . --write. Then run node scripts/check.mjs and confirm G4 passes.",
    effort: "~5 min",
  },
  G5: {
    why: "A changelog is for maintainers; release notes are for users. Without a curated RELEASE-NOTES.md, adopters have no human-readable summary of what changed and why they should upgrade.",
    fixPrompt: "Use askit-release (notes mode) to create a curated, user-facing RELEASE-NOTES.md distinct from CHANGELOG.md. Then run node scripts/check.mjs and confirm G5 passes.",
    effort: "~15 min",
  },
  G6: {
    why: "A component removed or replaced without following the deprecation policy breaks consumers who depended on it; an explicit deprecation gives them a status, a reason, and a migration path.",
    fixPrompt: "Use askit-deprecate to give the removed or replaced component a status, a reason, and a migration path. Then run node scripts/check.mjs and confirm G6 passes.",
    effort: "~10 min",
  },
  G7: {
    why: "The audience/level/doc-role frontmatter taxonomy is what lets the docs site route a reader to the right page; without it the generated site cannot organize the library's documentation.",
    fixPrompt: "Use askit-build-docs to add the audience/level/doc-role frontmatter taxonomy to every published docs page. Then run node scripts/check.mjs and confirm G7 passes.",
    effort: "~20 min",
  },
  G8: {
    why: "A meaningful folder with no README leaves a reader guessing what it holds; a short folder guide is the cheapest orientation a contributor or consumer gets.",
    fixPrompt: "Use askit-build-docs (folder-readme mode) on <component>: scaffold a README.md for the meaningful folder. Then run node scripts/check.mjs and confirm G8 passes.",
    effort: "~15 min",
  },
  G9: {
    why: "A script with no what-it-is / what-it-does / why docblock forces a maintainer to reverse-engineer its purpose; the four-field header keeps the toolkit's own machinery legible.",
    fixPrompt: "Use askit-build-docs to add the what-it-is / what-it-does / why / used-by docblock header to <component>. Then run node scripts/check.mjs and confirm G9 passes.",
    effort: "~15 min",
  },
  G10: {
    why: "A library without the Diataxis quadrants (tutorials, how-to, reference, explanation) leaves whole classes of reader unserved; their presence is what makes the documentation complete rather than incidental.",
    fixPrompt: "Use askit-build-docs to scaffold the missing Diataxis quadrants (tutorials, how-to, reference, explanation) under docs/. Then run node scripts/check.mjs and confirm G10 passes.",
    effort: "~30 min",
  },
});

/** Safe lookup: a reqId with no entry falls back to a generic shape so the renderer never throws. */
export function metaFor(reqId) {
  return REPORT_META[reqId] ?? { why: "See STANDARD.md for the requirement this check enforces.", fixPrompt: "", effort: "" };
}
