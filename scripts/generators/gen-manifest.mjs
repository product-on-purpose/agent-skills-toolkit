// what-it-is:   the native-manifest generator
// what-it-does: regenerates the per-agent native manifests and manifest.generated.json from library.json plus component frontmatter
// why:          generating the per-agent manifests from one source keeps Claude Code and Codex in lockstep
// used-by:      run by contributors and the cadence; its output is drift-checked by manifest-drift (U8)
import { loadPlugin } from "../lib/load-plugin.mjs";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { normalizeArgPath } from "../lib/fs-utils.mjs";

/** manifest.generated.json = the resolved/expanded form of library.json + on-disk skills (Q1.3). */
export function renderManifest(ctx) {
  const lib = ctx.library.data ?? {};
  const obj = {
    name: lib.name ?? null,
    version: lib.version ?? null,
    tier: lib.tier ?? null,
    standard: lib.standard ?? null,
    skills: ctx.skills.map((s) => ({
      name: s.name,
      path: path.relative(ctx.root, s.skillMdPath).split(path.sep).join("/"),
      description: s.frontmatter?.description ?? null,
    })),
    commands: (ctx.commands || []).map((c) => ({
      name: c.name,
      path: path.relative(ctx.root, c.file).split(path.sep).join("/"),
      description: c.frontmatter?.description ?? null,
      mapsTo: c.frontmatter?.["maps-to"] ?? null,
    })),
  };
  if ((ctx.mcpServers || []).length) {
    obj.mcpServers = ctx.mcpServers.map((s) => ({
      name: s.name,
      transport: typeof s.def?.url === "string" ? "http" : "stdio",
    }));
  }
  return JSON.stringify(obj, null, 2) + "\n";
}

/** Shared spine fields both native manifests carry, sourced from library.json. */
function nativeSpine(lib) {
  return {
    name: lib.name ?? null,
    version: lib.version ?? null,
    description: lib.description ?? null,
    ...(lib.license ? { license: lib.license } : {}),
    author: lib.author ?? null,
    homepage: lib.homepage ?? null,
    repository: lib.repository ?? null,
    keywords: Array.isArray(lib.keywords) ? lib.keywords : [],
  };
}

/** .claude-plugin/plugin.json (Claude native manifest), generated from library.json. */
export function renderClaudeNativeManifest(ctx) {
  const lib = ctx.library.data ?? {};
  const obj = nativeSpine(lib);
  if (ctx.mcpPath) obj.mcpServers = "./.mcp.json";
  return JSON.stringify(obj, null, 2) + "\n";
}

/** Title-case a kebab name for the Codex marketplace displayName. */
function displayNameFor(lib) {
  if (typeof lib.displayName === "string" && lib.displayName) return lib.displayName;
  return String(lib.name ?? "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * .codex-plugin/plugin.json (Codex native manifest), generated from library.json.
 * Codex format (CLI v0.135, Standard sec 3.2/10.1): shared spine + a "skills"
 * pointer + an "interface" marketplace block. Minimal accepted interface is
 * { displayName, category }; no commands field, no URL fields. displayName/category
 * derive from library.json unless explicitly declared.
 */
export function renderCodexNativeManifest(ctx) {
  const lib = ctx.library.data ?? {};
  const obj = {
    ...nativeSpine(lib),
    skills: "./skills/",
    interface: {
      displayName: displayNameFor(lib),
      category: typeof lib.category === "string" && lib.category ? lib.category : "Engineering",
    },
  };
  if (ctx.mcpPath) obj.mcpServers = "./.mcp.json";
  return JSON.stringify(obj, null, 2) + "\n";
}

const RENDERERS = {
  resolved: { file: "manifest.generated.json", render: renderManifest },
  claude: { file: ".claude-plugin/plugin.json", render: renderClaudeNativeManifest },
  codex: { file: ".codex-plugin/plugin.json", render: renderCodexNativeManifest },
};

/**
 * Field-loss protection (E72, adopting a plugin can wipe its hand-written manifest fields).
 *
 * Adopting a plugin with a thin library.json, then running `gen-manifest --write`, used to
 * null out or empty every spine field a native manifest carried. Those fields are homepage,
 * repository, license, author, and keywords. It could also replace a hand-set Codex
 * displayName/category with a worse computed guess.
 *
 * `fieldLosses` below does NOT walk a fixed allowlist of fields: it walks every non-empty key
 * the EXISTING file carries (recursing one level into Codex's `interface` block), so a vendor
 * interface key neither renderer has ever heard of (shortDescription, brandColor, and the rest
 * of the Codex marketplace block) is still caught, not just the two keys the renderer happens
 * to emit. This table is only the libKey MAP: which library.json key, if any, can justify a
 * change at a given field path. A field with no entry here has no library.json home at all, so
 * any loss there can only be waved through with `--allow-field-loss`.
 */
export const NATIVE_LIB_KEY_MAP = {
  name: "name",
  version: "version",
  description: "description",
  homepage: "homepage",
  repository: "repository",
  license: "license",
  author: "author",
  keywords: "keywords",
  "interface.displayName": "displayName",
  "interface.category": "category",
};

/** True for undefined/null, an empty/whitespace-only string, an empty array, or an empty object. */
function isEmptyValue(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v).length === 0;
  return false;
}

/** Reads a dotted path ("interface.displayName") out of a plain object; missing segments read as undefined. */
function getAtPath(obj, dotted) {
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function valuesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compares an existing native manifest to a freshly rendered one, field by field. It reports
 * every field that would be LOST. A field is lost when the existing value is non-empty, the
 * rendered value differs from (or omits) it, and library.json does not supply it. A value
 * library.json DOES supply, even when it differs from what is on disk, is a deliberate
 * regeneration, not a loss. It is never reported.
 *
 * The fields it checks are not a fixed list: it walks every non-empty top-level key the
 * EXISTING object carries, plus (one level deep only) every key inside an existing `interface`
 * block, so a vendor field neither renderer has ever heard of is still caught. `libKeyMap`
 * supplies the library.json key, if any, that can justify a change at a given field path; a
 * field with no entry has no library.json home, so `lost[].libKey` comes back null and only
 * `--allow-field-loss` is a way through. Pure and side-effect-free, so directly unit-testable.
 */
export function fieldLosses(existingObj, newObj, lib, libKeyMap = NATIVE_LIB_KEY_MAP) {
  const lost = [];
  const seen = new Set();

  const checkField = (field) => {
    if (seen.has(field)) return;
    seen.add(field);
    const oldVal = getAtPath(existingObj, field);
    if (isEmptyValue(oldVal)) return;
    const newVal = getAtPath(newObj, field);
    if (valuesEqual(oldVal, newVal)) return;
    const libKey = libKeyMap[field] ?? null;
    const libVal = libKey ? lib?.[libKey] : undefined;
    if (!isEmptyValue(libVal)) return; // library.json supplies a (possibly different) value: deliberate regeneration
    lost.push({ field, existing: oldVal, libKey });
  };

  for (const key of Object.keys(existingObj ?? {})) {
    if (key === "interface") continue; // walked separately, one level deep, below
    checkField(key);
  }
  const existingInterface = existingObj?.interface;
  if (existingInterface && typeof existingInterface === "object" && !Array.isArray(existingInterface)) {
    for (const key of Object.keys(existingInterface)) checkField(`interface.${key}`);
  }

  return lost;
}

if (process.argv[1]?.endsWith("gen-manifest.mjs")) {
  // Normalized through normalizeArgPath so a Windows backslash root is not silently misread (the
  // historical defect: docs/how-to/troubleshoot-the-gate.md).
  const rawRoot = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
  const root = rawRoot !== undefined ? normalizeArgPath(rawRoot) : process.cwd();
  const targetArg = process.argv.find((a) => a.startsWith("--target="));
  const target = targetArg ? targetArg.slice("--target=".length) : "all";
  const write = process.argv.includes("--write");
  const allowFieldLoss = process.argv.includes("--allow-field-loss");
  if (target === "all" && !write) {
    process.stderr.write("--target=all requires --write (it generates multiple files)\n");
    process.exit(2);
  }
  const ctx = loadPlugin(root);
  const lib = ctx.library.data ?? {};

  const keys = target === "all" ? ["resolved", "claude", "codex"] : [target];
  const toProcess = [];
  for (const k of keys) {
    const r = RENDERERS[k];
    if (!r) {
      process.stderr.write(`unknown --target "${k}" (use resolved|claude|codex|all)\n`);
      process.exit(2);
    }
    toProcess.push({ r, text: r.render(ctx), checkLoss: write && (k === "claude" || k === "codex") });
  }

  // Field-loss check runs only on a --write of a native manifest (claude or codex). It never
  // runs on a print-only or --target=resolved run. The non-write paths and the steady state are
  // unaffected (E72, adopting a plugin can wipe its hand-written manifest fields). It is checked
  // across every target in THIS invocation before anything is written. A --target=all run
  // therefore never writes claude and codex into disagreement: either every target in the run
  // is clear, or nothing in the run is written.
  const problems = [];
  if (write) {
    for (const { r, text, checkLoss } of toProcess) {
      if (!checkLoss) continue;
      const abs = path.join(root, r.file);
      let existingObj = null;
      let unreadable = false;
      try {
        existingObj = JSON.parse(readFileSync(abs, "utf8"));
      } catch (e) {
        if (e.code !== "ENOENT") unreadable = true; // present but unparseable: fail closed, never overwrite blind
      }
      if (unreadable) {
        problems.push({ file: r.file, lost: [{ field: "(whole file)", existing: "present but not valid JSON", libKey: null }] });
        continue;
      }
      if (!existingObj) continue; // nothing on disk yet: nothing to lose
      const lost = fieldLosses(existingObj, JSON.parse(text), lib);
      if (lost.length) problems.push({ file: r.file, lost });
    }
  }

  if (problems.length && !allowFieldLoss) {
    process.stderr.write(
      "refuse to write: regenerating would drop, empty, or replace field(s) that the existing manifest carries and library.json does not supply.\n"
    );
    for (const p of problems) {
      process.stderr.write(`  ${p.file}:\n`);
      for (const l of p.lost) {
        // The native path (e.g. interface.displayName) is not always the library.json key that
        // can supply it (displayName, top-level). Name the library.json key when it differs, or
        // say plainly that library.json has no field for this one at all (E72, finding 3). The
        // whole-file (malformed JSON) entry is neither case: there is no single field to map.
        let suffix = "";
        if (l.field !== "(whole file)") {
          if (l.libKey && l.libKey !== l.field) suffix = ` (set library.json "${l.libKey}")`;
          else if (!l.libKey) suffix = " (no library.json field carries this; --allow-field-loss is the only way through)";
        }
        process.stderr.write(`    - ${l.field} (existing: ${JSON.stringify(l.existing)})${suffix}\n`);
      }
    }
    process.stderr.write(
      "Add the missing field(s) to library.json so the regeneration is deliberate, or pass --allow-field-loss to overwrite them anyway. Nothing was written.\n"
    );
    process.exit(1);
  }

  for (const { r, text } of toProcess) {
    if (write) {
      const abs = path.join(root, r.file);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, text);
    } else {
      process.stdout.write(text);
    }
  }
}
