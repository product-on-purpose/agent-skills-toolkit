// what-it-is:   RS-B2 firing-case map for the Universal (U*) band
// what-it-does: exports the array of {reqId, fixture, expect} cases the spine-firing runner replays
//               against scripts/lib/registry.mjs's Universal checks
// why:          RS-B2 proves every spine check has at least one case that makes it fire; this file is
//               the band agent's one surface to fill in, so a later pass can diff it without touching
//               the runner (docs/internal/roadmap.md "## RS-B2")
// used-by:      tests/unit/spine-firing/spine-firing.test.mjs

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** @type {import("./spine-firing.test.mjs").FiringCase[]} */
export const cases = [
  // U1 (library-json): library.json missing a required field (tier) fires a U1 error naming it.
  {
    reqId: "U1",
    fixture: () => ({
      root: ".",
      library: { path: "library.json", data: { name: "x", version: "0.1.0", description: "d".repeat(40), standard: "0.7" }, parseError: null },
      agentsMdPath: null,
      skills: [],
    }),
    expect: { severity: "error", message: /missing required field "tier"/ },
  },

  // U2 (anatomy): a plugin with no AGENTS.md at the root fires a U2 error.
  {
    reqId: "U2",
    fixture: () => ({ root: ".", library: { data: { name: "x" }, parseError: null }, agentsMdPath: null, skills: [] }),
    expect: { severity: "error", message: /AGENTS\.md is required at the repository root/ },
  },

  // U3 (frontmatter-valid): a skill frontmatter missing the required "description" string fires.
  {
    reqId: "U3",
    fixture: () => ({
      root: ".",
      skills: [{ name: "s", skillMdPath: "skills/s/SKILL.md", frontmatter: { name: "s" }, parseError: null }],
    }),
    expect: { severity: "error", message: /missing required string "description"/ },
  },

  // U4 (name-matches-dir): the committed anti fixture where frontmatter name != directory name.
  {
    reqId: "U4",
    fixture: "anti/name-mismatch",
    expect: { severity: "error", message: /wrong-name/ },
  },

  // U5 (description-score), boundary-sensitive: this description scores 0.65 (verified via
  // scoreDescription in this check's own module) - below THRESHOLD (0.7) so it fires today, but above
  // READABLE_FLOOR (0.1), so a future regression that moved THRESHOLD down to 0.1 (the audit's F-035
  // scenario) would stop this case firing, proving the case actually depends on the live threshold
  // rather than on an unreadable-description decline (ADR 0049).
  {
    reqId: "U5",
    fixture: () => {
      const root = "."; // the check only reads ctx.skills; no disk access needed for this ctx shape
      const description = "Converts a CSV export into a normalized ledger for monthly reconciliation and bookkeeping tasks.";
      return {
        root,
        skills: [{ name: "s", skillMdPath: "skills/s/SKILL.md", frontmatter: { name: "s", description }, parseError: null }],
      };
    },
    expect: { severity: "warn", message: /description scores 0\.65 \(< 0\.7\)/ },
  },

  // U7 (instruction-budget), thin (one pre-existing firing test): an over-long SKILL.md body (> the
  // 500-line MAX_LINES budget) fires a warn naming the line count.
  {
    reqId: "U7",
    fixture: () => ({
      root: ".",
      skills: [{ name: "s", skillMdPath: "skills/s/SKILL.md", body: "line\n".repeat(600), frontmatter: { name: "s" }, parseError: null }],
    }),
    expect: { severity: "warn", message: /SKILL\.md body is 600 lines \(> 500\)/ },
  },

  // U6 (reference-links): a dangling relative link in a skill body fires a U6 error naming the target.
  // `dir` is a fresh, never-created temp path so the link cannot accidentally resolve against whatever
  // the test runner's cwd happens to contain.
  {
    reqId: "U6",
    fixture: () => {
      const dir = path.join(tmpdir(), "u6-spine-firing-does-not-exist");
      return {
        root: dir,
        skills: [{
          name: "s",
          dir,
          skillMdPath: path.join(dir, "skills", "s", "SKILL.md"),
          body: "see [ref](references/missing.md)",
          frontmatter: { name: "s" },
          parseError: null,
        }],
      };
    },
    expect: { severity: "error", message: /references\/missing\.md.*does not resolve/ },
  },

  // U8 (manifest-drift): version drift between the committed native manifest and library.json is the
  // release-tag-guard invariant, so it is an ERROR (name drift is only a warn and is not this case).
  {
    reqId: "U8",
    fixture: () => ({
      root: ".",
      library: { data: { name: "x", version: "0.2.0" } },
      claudeManifest: { name: "x", version: "0.1.0" },
    }),
    expect: { severity: "error", message: /version "0\.1\.0" differs from library\.json "0\.2\.0"/ },
  },

  // U9 (version-match): the committed anti fixture where package.json's version disagrees with
  // library.json's.
  {
    reqId: "U9",
    fixture: "anti/version-mismatch",
    expect: { severity: "error", message: /package\.json version .* must equal library\.json version/ },
  },

  // U11 (mcp-valid): an .mcp.json server declaring neither a stdio command nor an http(s) url fires.
  {
    reqId: "U11",
    fixture: () => ({ mcpServers: [{ name: "bad", def: {} }] }),
    expect: { severity: "error", message: /server "bad" must declare a non-empty "command"/ },
  },

  // U12 (mermaid-valid): a ```mermaid block whose first line is not a recognized diagram keyword,
  // built in a fresh temp tree (this check walks ctx.root on disk, so no fixture path/inline-ctx
  // shape can stand in for a real file).
  {
    reqId: "U12",
    setup: () => {
      const dir = mkdtempSync(path.join(tmpdir(), "u12-spine-firing-"));
      writeFileSync(path.join(dir, "a.md"), "```mermaid\nnotadiagram LR\n  A --> B\n```\n");
      return () => ({ root: dir });
    },
    expect: { severity: "error", message: /recognized diagram keyword/ },
  },

  // U13 (skill-registration): a skill that exists on disk under skills/ but is absent from
  // library.json's components.skills[] (which has opted into enumeration by being an array) is
  // invisible to installers.
  {
    reqId: "U13",
    fixture: () => ({
      root: ".",
      library: { data: { components: { skills: [] } } },
      skills: [{ name: "orphan", dir: "skills/orphan" }],
    }),
    expect: { severity: "error", message: /skill "orphan" exists on disk \(skills\/orphan\/\) but is not registered/ },
  },

  // U14 (agent-restricted-fields): a plugin-shipped agent declaring `hooks`, which Claude Code refuses
  // on a plugin-shipped agent.
  {
    reqId: "U14",
    fixture: () => ({
      root: ".",
      subagents: [{ name: "worker", file: "agents/worker.md", frontmatter: { name: "worker", description: "d", hooks: {} }, parseError: null }],
    }),
    expect: { severity: "error", message: /agent "worker" declares `hooks`/ },
  },

  // U15 (agents-dir-registerable): a .md file the runtime loads from agents/ that the plugin never
  // registered as a subagent (the underscore-prefix-protects-nothing case).
  {
    reqId: "U15",
    fixture: () => ({
      root: ".",
      subagents: [],
      agentDocs: [{ name: "_unsafe", file: "agents/_unsafe.md" }],
    }),
    expect: { severity: "error", message: /agents\/_unsafe\.md is shipped under agents\/ but is not a registered subagent/ },
  },

  // U16 (metadata-placement): a Standard sec 3.7 key ("version") declared at the top level of skill
  // frontmatter instead of nested under `metadata` - silently lost, nothing reads it there.
  {
    reqId: "U16",
    fixture: () => ({
      root: ".",
      skills: [{ name: "s", skillMdPath: "skills/s/SKILL.md", frontmatter: { name: "s", description: "d", version: "1.0.0" }, parseError: null }],
    }),
    expect: { severity: "error", message: /declares "version" at the top level; Standard sec 3\.7 places it under "metadata"/ },
  },

  // U17 (catalogue-manifest-shape): a .claude-plugin/marketplace.json present on disk but carrying no
  // "plugins" array - read by no scope. Built in a fresh temp tree because the check reads the file
  // from ctx.root itself rather than taking it from ctx.
  {
    reqId: "U17",
    setup: () => {
      const dir = mkdtempSync(path.join(tmpdir(), "u17-spine-firing-"));
      mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
      writeFileSync(path.join(dir, ".claude-plugin", "marketplace.json"), JSON.stringify({ name: "c" }));
      return () => ({ root: dir });
    },
    expect: { severity: "error", message: /has no "plugins" array/ },
  },

  // U18 (command-size-cap): on a plugin that declares codex as an agent-target, a commands/*.md file
  // over Codex's 4000-byte migration cap fires a warn naming the byte count.
  {
    reqId: "U18",
    fixture: () => ({
      root: ".",
      library: { data: { "agent-targets": ["codex"] } },
      commands: [{ file: "commands/big.md", raw: "x".repeat(4001) }],
    }),
    expect: { severity: "warn", message: /command "commands\/big\.md" is 4001 bytes, over the 4000-byte cap/ },
  },
];
