// what-it-is:   the cross-member analyses of marketplace scope (ADR 0039)
// what-it-does: the six deterministic finding classes that move the collection verdict (manifest shape,
//               entry resolvability, duplicate catalogue names, cross-member skill-directory collision,
//               cross-member command-name collision, registry-vs-member version agreement), plus rename
//               collisions and the plugin-shipped-agent restricted-fields reading, plus three advisory
//               analyses that can never move it
// why:          each of these is a defect that exists only in the UNION of members, so every per-member
//               grade can be green while the catalogue is broken. They are objective string comparisons
//               over data the resolve step already loaded, which is what lets them be deterministic
//               findings rather than judgment
// used-by:      scripts/lib/marketplace/evaluate-marketplace.mjs
import path from "node:path";
import { createHash } from "node:crypto";
import { finding, SEVERITY } from "../findings.mjs";
import { AGENT_FIELDS_DOC, AGENT_FIELDS_QUOTE, PLUGIN_AGENT_SUPPORTED_FIELDS as SUPPORTED_FIELDS, unsupportedFieldsOn } from "../vendor-agent-fields.mjs";

/**
 * The check ids marketplace scope emits. Every one carries `reqId: null` on purpose: ADR 0039 question 3
 * chose scope-local deterministic findings over numbered spine checks, so the 30-check spine every
 * existing plugin is held to does not move in the release that adds the capability to see between
 * members. Graduating any of these to a numbered check is its own ADR, with the warn-first burndown
 * U13 established.
 */
export const MARKETPLACE_CHECKS = Object.freeze({
  MANIFEST: "marketplace-manifest",
  RESOLVABILITY: "marketplace-entry-resolvability",
  DUPLICATE_NAME: "marketplace-duplicate-name",
  SKILL_COLLISION: "marketplace-skill-collision",
  COMMAND_COLLISION: "marketplace-command-collision",
  VERSION_AGREEMENT: "marketplace-version-agreement",
  RENAME_COLLISION: "marketplace-rename-collision",
  AGENT_RESTRICTED_FIELDS: "marketplace-agent-restricted-fields",
});

/**
 * `reqId: null` on EVERY marketplace finding, and that is a ratified DECISION rather than a default
 * (ADR 0051). The criterion, should a ninth class ever be proposed:
 *
 *   THE UNILATERAL-REMEDY TEST. A marketplace finding may become a numbered spine requirement only if
 *   the member named in it can resolve it by editing its OWN repository alone, without reference to
 *   any other member and without editing the catalogue.
 *
 * Applied to all eight classes, exactly one passes - and it already graduated, as `U14` in v1.13.0.
 * Of the rest: `manifest`, `duplicate-name` and `rename-collision` are properties of the CATALOGUE's
 * own file; `entry-resolvability` of a catalogue ENTRY; `skill-collision` and `command-collision` of a
 * PAIR of members, where neither is wrong and the Standard names no yielder; and `version-agreement`
 * is a two-party disagreement between a catalogue pin and a member manifest. The spine is a contract
 * each PLUGIN is held to individually, and a requirement it cannot discharge alone is not a
 * requirement, it is a hostage.
 *
 * The file each finding names is EVIDENCE of ownership, not formatting: six of the seven point at
 * `.claude-plugin/marketplace.json` or at a path spanning two members. A finding whose `file` cannot
 * be a path inside exactly one member's tree has already failed the test.
 *
 * ONE THING WOULD REOPEN THIS, and only for two of the seven. The collision classes depend on
 * component names entering a SHARED POOL, which is a RUNTIME behaviour: if a runtime namespaces
 * components by plugin they should be RETIRED, not graduated; if the Standard ever names which member
 * must yield, a member could resolve one alone and they would become eligible. The other five are
 * unconditional - no vendor change makes a member the owner of a catalogue's file.
 */
const mkFinding = (check, severity, message, file) => finding(check, severity, message, { file: file ?? null, reqId: null });

/** Two entries claiming one catalogue name: an installer asking for that name gets an ambiguous answer. */
export function duplicateCatalogueNames(entries) {
  const seen = new Map();
  const out = [];
  for (const e of entries) {
    if (e.name == null) continue; // an unnamed entry is already a manifest-shape finding
    if (seen.has(e.name)) {
      out.push(mkFinding(
        MARKETPLACE_CHECKS.DUPLICATE_NAME, SEVERITY.ERROR,
        `two catalogue entries claim the name "${e.name}" (plugins[${seen.get(e.name)}] and plugins[${e.index}]); an installer resolving that name has no defined answer`,
      ));
      continue;
    }
    seen.set(e.name, e.index);
  }
  return out;
}

/**
 * A `renames` entry must not collide with any live catalogue name or with another entry's renames.
 * The field exists so a consumer following an old name can be redirected to the current one; two
 * entries claiming one former name, or a former name that is also somebody's current name, makes the
 * redirection ambiguous, which is the same defect as a duplicate name one step back in time.
 */
export function renameCollisions(entries) {
  const currentByName = new Map(entries.filter((e) => e.name != null).map((e) => [e.name, e]));
  const claimedBy = new Map();
  const out = [];
  for (const e of entries) {
    for (const old of e.renames) {
      const live = currentByName.get(old);
      if (live && live.index !== e.index) {
        out.push(mkFinding(
          MARKETPLACE_CHECKS.RENAME_COLLISION, SEVERITY.ERROR,
          `entry "${e.name ?? `plugins[${e.index}]`}" lists "${old}" among its renames, but "${old}" is also the CURRENT name of plugins[${live.index}]; a consumer following that former name cannot be redirected unambiguously`,
        ));
        continue;
      }
      if (claimedBy.has(old)) {
        out.push(mkFinding(
          MARKETPLACE_CHECKS.RENAME_COLLISION, SEVERITY.ERROR,
          `two entries claim "${old}" as a former name (${claimedBy.get(old)} and ${e.name ?? `plugins[${e.index}]`}); a redirect from it has no defined target`,
        ));
        continue;
      }
      claimedBy.set(old, e.name ?? `plugins[${e.index}]`);
    }
  }
  return out;
}

/**
 * The registry entry's `version` against the member's own `library.json` version. ADR 0039 question 3
 * keeps this in the first release because resolving an entry in order to grade it already loads both
 * operands, so the comparison costs a string equality and adds no fetch, no credential, and no failure
 * mode the resolve step did not already have. The defect it catches is this project's recurring one: a
 * record drifting from the thing it describes.
 */
export function versionAgreement(members) {
  const out = [];
  for (const m of members) {
    if (m.status !== "resolved") continue;
    const declared = m.entry.declaredVersion;
    const actual = m.library?.version ?? null;
    if (declared == null || actual == null) continue; // absence is a manifest-shape question, not a disagreement
    if (declared !== actual) {
      out.push(mkFinding(
        MARKETPLACE_CHECKS.VERSION_AGREEMENT, SEVERITY.ERROR,
        `catalogue entry "${m.entry.name}" declares version ${declared}, but that member's own library.json declares ${actual}; ` +
        `either the member released without its registry pin moving, or the pin moved past a release that never shipped`,
        path.posix.join(".claude-plugin", "marketplace.json"),
      ));
    }
  }
  return out;
}

/** Collisions in the union of member `skills/<name>/` directories. */
export function skillCollisions(members) {
  return collisionsOver(members, (m) => m.skillNames, MARKETPLACE_CHECKS.SKILL_COLLISION, "skill directory", "skills/");
}

/** Collisions in the union of member command names. */
export function commandCollisions(members) {
  return collisionsOver(members, (m) => m.commandNames, MARKETPLACE_CHECKS.COMMAND_COLLISION, "command", "commands/");
}

/**
 * The shared collision engine. Component names enter a SHARED POOL on any agent that does not namespace
 * by plugin, which is the same reasoning that motivates `S2` (prefix) inside a single plugin, applied
 * one level up. Each member grades clean in isolation; the collision only exists in the union, which is
 * exactly the class of defect a per-plugin loop cannot see.
 */
function collisionsOver(members, pick, check, label, dirLabel) {
  const owners = new Map();
  for (const m of members) {
    if (m.status !== "resolved") continue;
    for (const name of pick(m)) {
      if (!owners.has(name)) owners.set(name, []);
      owners.get(name).push(m.entry.name ?? path.basename(m.dir));
    }
  }
  const out = [];
  for (const [name, holders] of [...owners.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (holders.length < 2) continue;
    out.push(mkFinding(
      check, SEVERITY.ERROR,
      `${holders.length} members ship the ${label} "${name}" (${holders.join(", ")}); on any agent that does not namespace components by plugin they occupy one name in a shared pool, and which one wins is undefined`,
      `${dirLabel}${name}`,
    ));
  }
  return out;
}

/**
 * Fields Claude Code does NOT support on a plugin-shipped agent (backlog A6).
 *
 * Vendor-cited, quoted rather than paraphrased, from the Claude Code plugins reference
 * (https://code.claude.com/docs/en/plugins-reference - the older docs.claude.com path 301-redirects
 * here; read 2026-08-12):
 *
 *   "Plugin agents support `name`, `description`, `model`, `effort`, `maxTurns`, `tools`,
 *    `disallowedTools`, `skills`, `memory`, `background`, and `isolation` frontmatter fields. The only
 *    valid `isolation` value is \"worktree\". For security reasons, `hooks`, `mcpServers`, and
 *    `permissionMode` are not supported for plugin-shipped agents."
 *
 * Note the vendor's own wording is "not supported for security reasons", which is stronger and more
 * precise than the "silently ignored" paraphrase this item was filed under: an author who writes one of
 * these believes they have configured something, and the field is refused rather than honored. Same
 * silent-no-op class as the v1.10.0 phantom-subagent discovery.
 */
// ADR 0045: the field list and the citation now live in scripts/lib/vendor-agent-fields.mjs, which U14
// reads too. Re-exported here rather than redefined so the two scopes CANNOT disagree - a plugin's
// verdict must not depend on whether it was graded on its own or as a catalogue member.
export { PLUGIN_AGENT_UNSUPPORTED_FIELDS, PLUGIN_AGENT_SUPPORTED_FIELDS } from "../vendor-agent-fields.mjs";

/**
 * A6: an agent shipped inside a plugin carrying a field the runtime refuses. WARN, not error, and
 * carrying no reqId - see MARKETPLACE_CHECKS. This is a reading over each member, not a spine check.
 * `U14` is the numbered plugin-scope requirement that graduated from it (ADR 0045), and per ADR 0051's
 * unilateral-remedy test it is the ONLY one of the eight classes that was ever eligible to.
 *
 * `agentDocs`, NOT `subagents`, and this is the whole of what ADR 0045 got wrong. That ADR shared the
 * vendor FIELD LIST between this reading and `U14` so the two scopes could not disagree - and they
 * still did, because they did not share the AGENT LIST. `U14` reads what a runtime LOADS; a member
 * built from the REGISTRATION list drops README.md and underscore-prefixed files, so the same bytes
 * produced a `U14` error when graded alone and nothing when graded as a catalogue member. The
 * `?? m.subagents` fallback keeps a hand-built member object (several unit tests build one) working,
 * and `tests/unit/marketplace-scope.test.mjs` carries the end-to-end parity test that a field-list
 * comparison cannot express.
 */
export function agentRestrictedFields(members) {
  const out = [];
  for (const m of members) {
    if (m.status !== "resolved") continue;
    for (const agent of m.agentDocs ?? m.subagents ?? []) {
      const fm = agent.frontmatter;
      if (!fm || typeof fm !== "object") continue;
      const offending = unsupportedFieldsOn(fm);
      if (offending.length === 0) continue;
      out.push(mkFinding(
        MARKETPLACE_CHECKS.AGENT_RESTRICTED_FIELDS, SEVERITY.WARN,
        `${m.entry.name ?? path.basename(m.dir)}: agent "${agent.name}" declares ${offending.map((f) => `\`${f}\``).join(", ")}, which Claude Code does not support on a plugin-shipped agent ` +
        `("${AGENT_FIELDS_QUOTE}" - ${AGENT_FIELDS_DOC}). ` +
        `The author has configured something the runtime refuses. Supported fields: ${SUPPORTED_FIELDS.join(", ")}.`,
        path.posix.join("agents", `${agent.name}.md`),
      ));
    }
  }
  return out;
}

// --- Advisory analyses -------------------------------------------------------------------------
// Namespaced under `advisory` by the orchestrator and never merged into `findings`, so none of them can
// reach the collection verdict or the exit code (ADR 0039: "Three analyses are advisory ... they can
// never move the collection verdict or the exit code"). They are deterministic all the same - these are
// string comparisons, not judgments - they simply are not conformance facts.

const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "when", "use", "used", "using", "this", "that", "it", "is", "are", "be", "you", "your", "skill", "skills"]);

/** Lowercase word set of a description, minus stop words and short tokens. Pure. */
export function triggerTokens(description) {
  if (typeof description !== "string") return new Set();
  return new Set(
    description.toLowerCase().split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  );
}

/** Jaccard similarity of two token sets. 0 when either is empty. */
export function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/**
 * Cross-member trigger-surface overlap (sensor reading 11): two skills in DIFFERENT members whose
 * descriptions compete for the same invocation. Advisory because "these compete" is a judgment about an
 * agent's routing behavior, not a defect anyone can point at in a file.
 */
export function triggerSurfaceOverlap(members, threshold = 0.5) {
  const all = [];
  for (const m of members) {
    if (m.status !== "resolved") continue;
    for (const s of m.skills ?? []) {
      all.push({ member: m.entry.name ?? path.basename(m.dir), name: s.name, tokens: triggerTokens(s.frontmatter?.description) });
    }
  }
  const out = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (all[i].member === all[j].member) continue;
      const score = jaccard(all[i].tokens, all[j].tokens);
      if (score >= threshold) {
        out.push({ a: `${all[i].member}/${all[i].name}`, b: `${all[j].member}/${all[j].name}`, similarity: Number(score.toFixed(3)) });
      }
    }
  }
  return out.sort((x, y) => y.similarity - x.similarity);
}

/** A member exposing one name as BOTH a command and a skill (reading 15). Advisory. */
export function commandSkillDivergence(members) {
  const out = [];
  for (const m of members) {
    if (m.status !== "resolved") continue;
    const skills = new Set(m.skillNames);
    for (const c of m.commandNames) {
      if (skills.has(c)) out.push({ member: m.entry.name ?? path.basename(m.dir), name: c });
    }
  }
  return out;
}

/** Byte-identical SKILL.md bodies shipped by two different members (PSR-12 lineage). Advisory. */
export function contentLineage(members) {
  const byHash = new Map();
  for (const m of members) {
    if (m.status !== "resolved") continue;
    for (const s of m.skills ?? []) {
      if (typeof s.raw !== "string" || s.raw === "") continue;
      const h = createHash("sha256").update(s.raw).digest("hex");
      if (!byHash.has(h)) byHash.set(h, []);
      byHash.get(h).push(`${m.entry.name ?? path.basename(m.dir)}/${s.name}`);
    }
  }
  return [...byHash.values()].filter((v) => v.length > 1).map((copies) => ({ copies: copies.sort() }));
}
