// what-it-is:   the filesystem helpers
// what-it-does: provides relPath, normalizeArgPath, the component-discovery listers (skills, agents, commands), and other fs helpers
// why:          centralizes path normalization and component discovery so a folder README is never mistaken for a component
// used-by:      imported by the checks, generators, the CLI entry points, and the plugin loader
import { readFileSync, existsSync, readdirSync, statSync, realpathSync } from "node:fs";
import path from "node:path";

/**
 * Directory names skipped by repo-wide content scanners, matched by basename at any depth:
 * dependency dirs, gitignored scratch, and build-output / tool-cache dirs. Generated artifacts
 * are not authored text, so content hygiene does not apply to them. Defined once here and shared
 * by every repo-wide content scanner (U12 mermaid-valid, G8 folder-readme, S6 source-doc,
 * and evaluate.mjs).
 *
 * Grouped by ecosystem, because the set is graded against third-party plugins and a category
 * covered for one language but not another produces findings that are the toolkit's fault, not
 * the plugin's. Python entries were added after a Python-bearing plugin was reported three G8
 * folder-readme findings for its bytecode caches.
 */
export const SKIP_DIRS = new Set([
  // version control
  ".git",
  // dependency directories
  "node_modules", ".venv", "venv",
  // build output
  "dist", ".astro",
  // tool caches
  ".memsearch", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox",
  // gitignored agent/author scratch
  "_local", "_LOCAL", "_agent-context",
]);

/** Repo-relative, slash-normalized path. Falls back to abs if root is falsy. */
export function relPath(root, abs) {
  return root ? path.relative(root, abs).split(path.sep).join("/") : abs;
}

/** The real path of p (symlinks resolved), or null when it cannot be resolved: missing, dangling, unreadable. */
export function realPathOrNull(p) {
  try {
    return realpathSync(p);
  } catch {
    return null;
  }
}

/**
 * True only when `abs`, with symlinks resolved, IS the resolved plugin root or lies beneath it. This is
 * the containment guard every directory walker applies before descending into a subdirectory, and it
 * exists because a symlink turned the gate loose on the host: `docs/esc -> /usr` made G7 report 178
 * pages under /usr, and `docs/loop -> ..` recursed until ENAMETOOLONG (431 findings). Any resolution
 * error - a dangling link, a path that does not exist, a permission failure - answers false, so an
 * entry that cannot be resolved is never descended into either. The comparison is against the root
 * plus a separator, never the bare prefix, so a sibling `plugin-2` of root `plugin` is outside.
 *
 * Containment is one half of the guard. The other half is a per-walk set of real paths already
 * entered: a link back INTO the plugin (`docs/loop -> ..` resolves to the root, which is inside) is a
 * loop, and each walker seeds that set with the root and skips a real path it has seen.
 */
export function isInsideRoot(root, abs) {
  const r = realPathOrNull(root);
  const a = realPathOrNull(abs);
  if (r === null || a === null) return false;
  return a === r || a.startsWith(r.endsWith(path.sep) ? r : r + path.sep);
}

/**
 * Normalize a filesystem path taken from argv (a CLI positional or a path-valued flag) before it reaches
 * anything else. This closes the recorded defect where a backslash path handed to a CLI entry point on
 * Windows was silently read as a different directory, so the gate graded an empty tree and printed a
 * clean pass (see docs/how-to/troubleshoot-the-gate.md and tests/unit/eval-run.test.mjs).
 *
 * On Windows (`sep === "\\"`, the default - taken from the live `path.sep`) backslashes are converted to
 * forward slashes. On POSIX (`sep === "/"`) the value is returned UNCHANGED: a backslash is a LEGAL
 * filename character there ("my\dir" is a real directory, distinct from "my/dir"), so an unconditional
 * swap would silently resolve to the WRONG path in the opposite direction - the same class of defect,
 * just facing the other way. Do not "simplify" this guard away; the asymmetry is deliberate and both
 * branches are exercised, with an injected separator, in tests/unit/fs-utils.test.mjs so neither
 * platform's behavior can regress unnoticed by only running the suite on the other one.
 *
 * It does NOT trim. An earlier draft did, and adversarial review caught why that is wrong: leading and
 * trailing spaces are legal in a POSIX filename, so "/srv/plugin " and "/srv/plugin" are two different
 * directories, and several callers here (gen-index, gen-manifest, sync-agents-md in --write mode) WRITE.
 * Trimming would silently retarget a write at a sibling directory, which is a strictly worse version of
 * the read-the-wrong-tree defect this function exists to close. The separator conversion is the only
 * transformation applied; whatever else the caller typed is theirs.
 *
 * `sep` is a parameter (not read internally from `path.sep` unconditionally) purely so tests can force
 * both branches deterministically on any host.
 *
 * Distinct from scripts/lib/eval-run.mjs's resolvePosix(), which intentionally swaps UNCONDITIONALLY: it
 * normalizes a clone path sourced from the TRACKED CORPUS MANIFEST, which may be authored on one OS and
 * read on another - there, portability of the pinned reference outranks the rare POSIX literal-backslash
 * filename. normalizeArgPath is for a path a human typed on the machine actually running the command
 * right now, where that POSIX case is real and must be respected. The two rules are intentionally
 * different; see resolvePosix's own docblock for the mirror of this note.
 */
export function normalizeArgPath(p, sep = path.sep) {
  const s = String(p ?? "");
  if (!s) return s;
  return sep === "\\" ? s.split("\\").join("/") : s;
}

export function fileExists(p) {
  return existsSync(p) && statSync(p).isFile();
}

/** Read + parse JSON. Missing file => {data:null,parseError:null}; bad JSON => {data:null,parseError:string}. */
export function readJsonSafe(p) {
  if (!existsSync(p)) return { data: null, parseError: null };
  try {
    return { data: JSON.parse(readFileSync(p, "utf8")), parseError: null };
  } catch (e) {
    return { data: null, parseError: e.message };
  }
}

/** Absolute paths of immediate subdirs of <root>/skills that contain a SKILL.md. */
export function listSkillDirs(root) {
  const skillsRoot = path.join(root, "skills");
  if (!existsSync(skillsRoot) || !statSync(skillsRoot).isDirectory()) return [];
  return readdirSync(skillsRoot)
    .map((name) => path.join(skillsRoot, name))
    .filter((dir) => statSync(dir).isDirectory() && fileExists(path.join(dir, "SKILL.md")));
}

/**
 * Every `.md` under `agents/`, at ANY depth, as { file, name } where `name` carries the relative
 * subpath. The shared walk behind both agent listers.
 *
 * RECURSIVE, and that was a wave-1 review finding rather than the original design. Both listers used a
 * flat `readdirSync`, which made `listRuntimeAgentDocs` NOT what the runtime loads - the exact thing its
 * own docblock claims. Claude Code states it verbatim: "Plugin `agents/` directories are also scanned
 * recursively", and "a file at `agents/review/security.md` in plugin `my-plugin` registers as
 * `my-plugin:review:security`" (read 2026-08-15). So `agents/review/_shadow.md` was a live subagent that
 * bypassed both `U14` and `U15`.
 *
 * The original probe recorded in folder-readme.mjs only ever tested a FLAT directory; the invariant was
 * generalised past its evidence, and nothing caught it because the tests were written from the same
 * mental model as the code.
 *
 * `name` keeps the subpath (`review/security`, not `security`) because the vendor makes the subfolder
 * part of the scoped identity. A bare basename would collide `agents/security.md` with
 * `agents/review/security.md`, which are two different subagents.
 *
 * A filename containing `:` is SKIPPED: the vendor reserves the colon for scoped identifiers and "doesn't
 * load a file whose name contains one". Reporting it would be stricter than the runtime, which is the
 * opposite of the failure these listers exist to prevent.
 */
/**
 * Is this basename a file the RUNTIME loads from `agents/`?
 *
 * Exported as a pure predicate, and that is not tidiness - it is the only way this rule can be tested on
 * Windows. A fixture named `bad:name.md` cannot exist there: NTFS reads the colon as the alternate-data-
 * stream separator, so `writeFileSync` SUCCEEDS and the directory ends up containing a file called `bad`
 * with no extension. A filesystem-fixture test of the colon rule is therefore silently VACUOUS on the
 * platform our own `validate-windows` job runs, which a mutation check caught: removing the guard turned
 * no test red.
 *
 * The rule itself is the vendor's: Claude Code "doesn't load a file whose name contains one [`:`]", which
 * it reserves for scoped identifiers. Excluding it keeps these listers exactly as wide as the runtime,
 * and no wider - being stricter than the runtime is the opposite of the failure they exist to prevent.
 */
export function isRuntimeAgentFile(basename) {
  return basename.endsWith(".md") && !basename.includes(":");
}

function walkAgentDocs(root) {
  const agentsRoot = path.join(root, "agents");
  if (!existsSync(agentsRoot) || !statSync(agentsRoot).isDirectory()) return [];
  const out = [];
  // Real paths already entered, seeded with the plugin root so a link back up to it is a loop rather
  // than a fresh subtree. With isInsideRoot this keeps the walk inside the plugin and finite: before,
  // `agents/loop -> ..` recursed until readdirSync threw ENAMETOOLONG out of loadPlugin itself.
  const seen = new Set([realPathOrNull(root), realPathOrNull(agentsRoot)]);
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir)) {
      const abs = path.join(dir, entry);
      if (existsSync(abs) && statSync(abs).isDirectory()) {
        if (!isInsideRoot(root, abs)) continue;
        const real = realPathOrNull(abs);
        if (real === null || seen.has(real)) continue;
        seen.add(real);
        walk(abs, prefix ? `${prefix}/${entry}` : entry);
        continue;
      }
      if (!isRuntimeAgentFile(entry)) continue;
      const stem = entry.slice(0, -3);
      out.push({ file: abs, name: prefix ? `${prefix}/${stem}` : stem });
    }
  };
  walk(agentsRoot, "");
  return out;
}

/**
 * Subagent definitions the plugin REGISTERS: every `.md` under `agents/` at any depth, excluding
 * `_`-prefixed control files (`_chain-permitted.yaml`, `_pairing.yaml`) and a folder `README.md`, since
 * a folder guide is not a component. Exclusion applies to the FILE's own name, so
 * `agents/review/_shadow.md` is excluded from registration while `agents/review/security.md` is not.
 */
export function listAgentFiles(root) {
  return walkAgentDocs(root)
    .filter(({ file }) => {
      const base = path.basename(file);
      return !base.startsWith("_") && base !== "README.md";
    })
    .map(({ file }) => file);
}

/** The same walk, as { file, name } pairs, so the loader can keep the scoped name. */
export function listAgentFilesNamed(root) {
  return walkAgentDocs(root).filter(({ file }) => {
    const base = path.basename(file);
    return !base.startsWith("_") && base !== "README.md";
  });
}

/** Every runtime-loaded agent doc as { file, name }, excluding nothing the runtime does not exclude. */
export function listRuntimeAgentDocsNamed(root) {
  return walkAgentDocs(root);
}

/** Absolute paths of commands/**
 * Absolute paths of EVERY .md under agents/, including README.md and underscore-prefixed files.
 *
 * listAgentFiles above answers "what does this plugin REGISTER as a subagent" and excludes those two
 * shapes. This answers a different question: "what will Claude Code actually LOAD at runtime". They are
 * not the same, and folder-readme.mjs records the empirical proof - a directory holding real-agent.md,
 * README.md, _README.md and README.txt registered THREE subagents: "real-agent", "README" and "_README".
 * The underscore prefix protects nothing; only the non-.md extension was skipped.
 *
 * Any check asking what a plugin SHIPS TO A RUNTIME must use this. U14 used the registration list, so it
 * could be bypassed by putting restricted fields in agents/_unsafe.md - a file Claude loads and the gate
 * never read.
 *
 * Three callers honour that today: `U14` (agent-restricted-fields), `U15` (agents-dir-registerable, which
 * exists to make this list and listAgentFiles' list provably EQUAL for a conforming plugin), and the
 * marketplace member build, whose divergence from U14 broke ADR 0045's cross-scope guarantee for a whole
 * release. A fourth caller that reaches for listAgentFiles instead is almost certainly a defect.
 */
export function listRuntimeAgentDocs(root) {
  return listRuntimeAgentDocsNamed(root).map(({ file }) => file);
}

/*.md definitions, excluding _-prefixed control files and a folder README.md. */
export function listCommandFiles(root) {
  const commandsRoot = path.join(root, "commands");
  if (!existsSync(commandsRoot) || !statSync(commandsRoot).isDirectory()) return [];
  return readdirSync(commandsRoot)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_") && name !== "README.md")
    .map((name) => path.join(commandsRoot, name))
    // fileExists guards against a directory named "<x>.md" (mirrors listAgentFiles).
    .filter((p) => fileExists(p));
}

/**
 * Absolute paths of `_workflows/*.md`, excluding a folder `README.md` and `_`-prefixed control files.
 * Mirrors listCommandFiles.
 *
 * The README exclusion is correct HERE and would be wrong in agents/, and the two must be read
 * together or the next reviewer will "harmonise" them (ADR 0047, ADR 0046). No runtime scans
 * `_workflows/` - it is a Standard construct that only this toolkit reads - so a folder guide there
 * creates no phantom anywhere and excluding it is a naming convention. In `agents/` the identical
 * exclusion hides a file the VENDOR loads, which is why listRuntimeAgentDocs above excludes nothing.
 * The difference is not style; it is whose discovery rules apply.
 */
export function listWorkflowFiles(root) {
  const workflowsRoot = path.join(root, "_workflows");
  if (!existsSync(workflowsRoot) || !statSync(workflowsRoot).isDirectory()) return [];
  return readdirSync(workflowsRoot)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_") && name !== "README.md")
    .map((name) => path.join(workflowsRoot, name))
    // fileExists guards against a directory named "<x>.md" (mirrors listAgentFiles).
    .filter((p) => fileExists(p));
}

/**
 * Recursively list file paths under dir (absolute). [] if dir missing. A subdirectory whose real path
 * lies outside `dir` (a symlink escaping it) or was already entered (a symlink loop) is skipped: this
 * helper knows no plugin root of its own, so the directory it was given is the containment root.
 */
export function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const seen = new Set([realPathOrNull(dir)]);
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const full = path.join(d, entry);
      if (statSync(full).isDirectory()) {
        if (!isInsideRoot(dir, full)) continue;
        const real = realPathOrNull(full);
        if (real === null || seen.has(real)) continue;
        seen.add(real);
        walk(full);
      } else {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}
