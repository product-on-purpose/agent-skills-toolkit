// what-it-is:   the deterministic half of the upstream standards watch (STANDARD.md sec 6)
// what-it-does: reads the upstream pin, extracts a structural surface from the fetched agentskills.io
//               specification, classifies each delta as material / review / cosmetic, resolves the
//               reqIds a delta touches, and renders the report, the ADR skeleton, and a proposed re-pin
// why:          sec 6 says the Universal tier MUST track agentskills.io, but nothing pinned the upstream,
//               so "has the spec changed" was unanswerable; this makes the detection half deterministic
//               and, deliberately, write-incapable, so a watcher can propose but never amend the Standard
// used-by:      scripts/standards-watch.mjs (the CLI) and skills/askit-standards-watch; covered by
//               tests/unit/standards-watch.test.mjs
//
// WRITE-INCAPABILITY IS LOAD-BEARING. This module imports readFileSync and nothing else from node:fs.
// tests/unit/standards-watch.test.mjs asserts that neither this module nor the CLI references any
// filesystem write API. Every produced artifact (report, ADR skeleton, re-pinned document) is RETURNED
// as a string or object for a human to review; nothing here can amend a check, STANDARD.md, or the pin.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { CHECKS } from "./registry.mjs";
import { escapeMdCell } from "./md-escape.mjs";

/** The tracked upstream pin, relative to the plugin root. */
export const PIN_REL = "docs/internal/standards-watch/upstream-pin.json";
/** The existing reqId reference table this module joins against instead of duplicating. */
export const UNIVERSAL_CHECKS_REL = "docs/reference/universal-checks.md";
/** The pin document schema this module understands. */
export const PIN_SCHEMA = "askit-upstream-pin/1";

/** A refusal. Every unverifiable precondition throws this rather than reporting a clean run. */
export class StandardsWatchError extends Error {
  constructor(message, code = "refused") {
    super(`standards-watch REFUSED: ${message}`);
    this.name = "StandardsWatchError";
    this.code = code;
  }
}

const refuse = (message, code) => { throw new StandardsWatchError(message, code); };

/* ------------------------------------------------------------------ hashing */

/**
 * The git blob SHA-1 of a byte buffer: sha1("blob " + length + "\0" + bytes). Identical to what
 * `git hash-object` prints and to the `sha` GitHub reports for a blob, so a pinned value is
 * verifiable by hand, offline, without this tool.
 */
export function gitBlobSha(bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}

/** A short content hash used for per-section bodies (16 hex chars is ample for change detection). */
export function bodyHash(text) {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

/**
 * The one cosmetic filter applied before hashing a section body: CRLF to LF, trailing whitespace
 * stripped per line, leading and trailing blank lines dropped. Reflowed indentation and line-ending
 * churn therefore do not register as a change; anything that alters a word does.
 */
export function normalizeBody(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

/* ------------------------------------------------------- surface extraction */

const HEADING_RE = /^(#{2,4})\s+(.+?)\s*$/;

/**
 * Deterministic code-unit ordering. Deliberately NOT localeCompare: a locale-sensitive sort makes the
 * recorded surface depend on the ICU data of whoever re-pinned, which would show up as phantom churn
 * in the pin diff. Ordering is presentation only (the diff itself is keyed, not positional), so plain
 * code-unit order is both sufficient and reproducible everywhere.
 */
const byCodeUnit = (key) => (a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0);

/** Every level 2-4 heading with a hash of its body. Localizes a change to a section. */
function extractSections(text) {
  const lines = normalizeBody(text).split("\n");
  const marks = [];
  lines.forEach((line, i) => {
    const m = HEADING_RE.exec(line);
    if (m) marks.push({ index: i, key: `${m[1]} ${m[2]}` });
  });
  if (marks.length === 0) {
    refuse(`no level 2-4 headings found in the specification text (${lines.length} lines); the document shape changed and the extractor cannot be trusted`, "extraction-failed");
  }
  const seen = new Map();
  return marks.map((mark, n) => {
    const end = n + 1 < marks.length ? marks[n + 1].index : lines.length;
    const body = normalizeBody(lines.slice(mark.index + 1, end).join("\n"));
    // Duplicate headings would otherwise collide silently; suffix them so the diff stays one-to-one.
    const count = (seen.get(mark.key) ?? 0) + 1;
    seen.set(mark.key, count);
    const key = count === 1 ? mark.key : `${mark.key} (${count})`;
    return { key, hash: bodyHash(body), lines: end - mark.index - 1 };
  });
}

/** The text of the section whose key matches, or null. */
function sectionBody(text, key) {
  const lines = normalizeBody(text).split("\n");
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const m = HEADING_RE.exec(lines[i]);
    if (!m) continue;
    if (start === -1 && `${m[1]} ${m[2]}` === key) { start = i + 1; level = m[1].length; continue; }
    if (start !== -1 && m[1].length <= level) return lines.slice(start, i).join("\n");
  }
  return start === -1 ? null : lines.slice(start).join("\n");
}

const CELL_FIELD_RE = /`([^`]+)`/;

/**
 * The frontmatter contract table under "### Frontmatter": one row per field, with its required flag
 * and its constraint prose. This is the single highest-value structural signal, because a new
 * required field or a tightened constraint is exactly what our U3 / U4 / U5 checks encode.
 */
function extractFrontmatterFields(text) {
  const body = sectionBody(text, "### Frontmatter");
  if (body === null) refuse("the '### Frontmatter' section was not found in the specification; the extractor cannot locate the field contract", "extraction-failed");
  // The FIRST contiguous table block only. sectionBody returns everything down to the next heading of
  // the same or shallower level, which includes the per-field subsections; filtering pipe-prefixed
  // lines globally would silently absorb any table that appeared in one of them.
  const lines = body.split("\n").map((l) => l.trim());
  const first = lines.findIndex((l) => l.startsWith("|"));
  const rows = [];
  for (let i = first; i >= 0 && i < lines.length && lines[i].startsWith("|"); i += 1) rows.push(lines[i]);
  if (rows.length < 3) refuse("no markdown table found under '### Frontmatter'; the field contract is no longer a table and the extractor cannot be trusted", "extraction-failed");
  const header = rows[0].split("|").map((c) => c.trim().toLowerCase()).filter((c) => c.length > 0);
  const iField = header.indexOf("field");
  const iRequired = header.indexOf("required");
  const iConstraints = header.indexOf("constraints");
  if (iField < 0 || iRequired < 0 || iConstraints < 0) {
    refuse(`the '### Frontmatter' table columns changed (found [${header.join(", ")}]; expected field/required/constraints); the extractor cannot be trusted`, "extraction-failed");
  }
  const out = [];
  for (const row of rows.slice(1)) {
    const cells = row.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length <= Math.max(iField, iRequired, iConstraints)) continue;
    if (/^:?-{2,}/.test(cells[iField])) continue; // the separator row
    const nameCell = cells[iField];
    const name = (CELL_FIELD_RE.exec(nameCell)?.[1] ?? nameCell).trim();
    if (name.length === 0) continue;
    out.push({
      field: name,
      required: /^yes$/i.test(cells[iRequired]) ? true : /^no$/i.test(cells[iRequired]) ? false : cells[iRequired],
      constraints: cells[iConstraints].replace(/\s+/g, " ").trim(),
    });
  }
  if (out.length === 0) refuse("the '### Frontmatter' table parsed to zero fields; the extractor cannot be trusted", "extraction-failed");
  return out.sort(byCodeUnit("field"));
}

/**
 * The skill directory inventory from the "## Directory structure" tree block: which files and
 * directories the spec names, and whether each is required. A new or removed entry is a new or
 * removed component type.
 */
function extractDirectories(text) {
  const body = sectionBody(text, "## Directory structure");
  if (body === null) refuse("the '## Directory structure' section was not found in the specification; the extractor cannot locate the component inventory", "extraction-failed");
  const fence = /```[^\n]*\n([\s\S]*?)```/.exec(body);
  if (!fence) refuse("no fenced tree block found under '## Directory structure'; the extractor cannot be trusted", "extraction-failed");
  const out = [];
  for (const raw of fence[1].split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim().length === 0) continue;
    // Strip the tree drawing prefix without naming its characters: everything before the first
    // ASCII word character, dot, or underscore is decoration.
    const stripped = line.replace(/^[^A-Za-z0-9_.]+/, "");
    const [entry, comment = ""] = stripped.split("#");
    const name = entry.trim();
    if (name.length === 0 || /^\.{2,}$/.test(name)) continue;
    if (name.endsWith("/") && out.length === 0) continue; // the tree root (skill-name/)
    const req = /\b(required|optional)\b/i.exec(comment);
    out.push({ entry: name, required: req ? req[1].toLowerCase() === "required" : null });
  }
  if (out.length === 0) refuse("the '## Directory structure' tree block parsed to zero entries; the extractor cannot be trusted", "extraction-failed");
  return out.sort(byCodeUnit("entry"));
}

/**
 * The structural surface of the specification: the field contract, the component inventory, and a
 * per-section body hash. Throws StandardsWatchError with code "extraction-failed" the moment any
 * anchor cannot be located, so a restructured upstream can never be reported as "no change".
 */
export function extractSurface(text) {
  if (typeof text !== "string" || text.trim().length === 0) refuse("the fetched specification is empty", "extraction-failed");
  return {
    frontmatterFields: extractFrontmatterFields(text),
    directories: extractDirectories(text),
    sections: extractSections(text),
  };
}

/* --------------------------------------------------------------- the pin */

/** Read and validate the pin document. Every shape problem is a refusal, never a default. */
export function readPin(root, pinRel = PIN_REL) {
  // resolve, not join, so an absolute --pin (a historical pin kept outside the tree) works too.
  const full = path.resolve(root, pinRel);
  let raw;
  try {
    raw = readFileSync(full, "utf8");
  } catch {
    refuse(`no upstream pin at ${pinRel}. The Standard cannot answer "has the spec changed" without one; create it, or pass --pin.`, "no-pin");
  }
  let pin;
  try {
    pin = JSON.parse(raw);
  } catch (e) {
    refuse(`${pinRel} is not valid JSON: ${e.message}`, "bad-pin");
  }
  validatePin(pin, pinRel);
  return pin;
}

/** Structural validation of a pin document. Throws on anything that would weaken the comparison. */
export function validatePin(pin, label = PIN_REL) {
  if (!pin || typeof pin !== "object" || Array.isArray(pin)) refuse(`${label} must be a JSON object`, "bad-pin");
  if (pin.schema !== PIN_SCHEMA) refuse(`${label} declares schema "${pin.schema}"; this tool understands "${PIN_SCHEMA}"`, "bad-pin");
  if (!pin.upstream || typeof pin.upstream.repo !== "string") refuse(`${label} is missing upstream.repo`, "bad-pin");
  if (!Array.isArray(pin.artifacts) || pin.artifacts.length === 0) refuse(`${label} declares no artifacts to watch`, "bad-pin");
  for (const a of pin.artifacts) {
    if (typeof a?.path !== "string" || a.path.length === 0) refuse(`${label} has an artifact with no path`, "bad-pin");
    if (typeof a.blobSha !== "string" || !/^[0-9a-f]{40}$/.test(a.blobSha)) refuse(`${label} artifact "${a.path}" has no 40-char blobSha; without it there is no "changed since"`, "bad-pin");
    if (typeof a.rawUrl !== "string") refuse(`${label} artifact "${a.path}" has no rawUrl to fetch`, "bad-pin");
  }
  // A recorded surface is required to DIFF, not to READ: --emit-pin is how a bootstrap pin acquires
  // one, so demanding it here would make the pin unbootstrappable. buildReport enforces it instead.
  return pin;
}

/* ------------------------------------------------------------- reqId join */

const TABLE_ROW_RE = /^\|\s*(U\d+|S\d+|G\d+)\s*\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*([^|]*?)\s*\|/;

/**
 * The reqId -> {module, what, standardSection} map, PARSED from docs/reference/universal-checks.md
 * rather than restated here, joined with each check module's own meta (tier, since, provenance) from
 * the registry. Deliberately not a second copy of a mapping that already exists in two places: a
 * duplicate would drift the first time a check moved.
 */
export function reqIdIndex(root) {
  const full = path.join(root, UNIVERSAL_CHECKS_REL);
  let text;
  try {
    text = readFileSync(full, "utf8");
  } catch {
    refuse(`${UNIVERSAL_CHECKS_REL} not found; the reqId mapping is read from it, never restated, so the run cannot resolve what a delta touches`, "no-check-reference");
  }
  const byReq = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = TABLE_ROW_RE.exec(line.trim());
    if (!m) continue;
    byReq.set(m[1], { reqId: m[1], module: m[2], what: m[3], standardSection: m[4] });
  }
  if (byReq.size === 0) {
    refuse(`no reqId rows parsed from ${UNIVERSAL_CHECKS_REL}; the reference table shape changed and the mapping cannot be trusted`, "no-check-reference");
  }
  for (const mod of CHECKS) {
    const meta = mod.meta;
    if (!meta?.reqId) continue;
    const row = byReq.get(meta.reqId);
    if (row) Object.assign(row, { tier: meta.tier, since: meta.since, provenance: meta.provenance ?? "objective" });
  }
  return byReq;
}

/* ------------------------------------------------------------------ diff */

const byKey = (arr, key) => new Map(arr.map((x) => [x[key], x]));

/**
 * The reqIds a delta touches, from the pin's explicit touches maps.
 *
 * For a subject that is NEW upstream (a field, directory, or section that did not exist at pin time)
 * an unmapped subject resolves to the empty list, not to the artifact default. That is the honest
 * answer and the useful one: a brand new upstream concept lands on no check of ours by definition,
 * and the report surfaces exactly those as the gap list. Falling back to the artifact's reqIds there
 * would manufacture five spurious impacts for every new field.
 */
function touchesFor(pin, kind, subject, artifactDefault, isNew = false) {
  const t = pin.touches ?? {};
  const bucket = kind === "field" ? t.fields : kind === "directory" ? t.directories : t.sections;
  const hit = bucket?.[subject];
  if (Array.isArray(hit)) return hit;
  return isNew ? [] : (artifactDefault ?? []);
}

/**
 * Classify pinned surface vs observed surface.
 *
 * MATERIAL (decided here, no judgment required): a frontmatter field added or removed; a field's
 * required flag changed; a field's constraint text changed; a directory entry added, removed, or
 * re-flagged; a section heading added or removed.
 *
 * REVIEW (deliberately NOT decided here): a section body changed with no field, directory, or
 * heading delta. That is a wording fix or a new normative sentence and the difference is a reading,
 * not a parse. The tool names the section and stops.
 */
export function diffSurface(pinned, observed, pin, artifactDefault) {
  const material = [];
  const review = [];

  const pf = byKey(pinned.frontmatterFields ?? [], "field");
  const of_ = byKey(observed.frontmatterFields ?? [], "field");
  for (const [name, cur] of of_) {
    const prev = pf.get(name);
    if (!prev) {
      material.push({ kind: "field-added", subject: name, detail: `new frontmatter field \`${name}\` (required: ${cur.required}); constraints: ${cur.constraints}`, touches: touchesFor(pin, "field", name, artifactDefault, true) });
      continue;
    }
    if (prev.required !== cur.required) {
      material.push({ kind: "field-required-changed", subject: name, detail: `\`${name}\` required flag moved from ${prev.required} to ${cur.required}`, touches: touchesFor(pin, "field", name, artifactDefault) });
    }
    if (prev.constraints !== cur.constraints) {
      material.push({ kind: "field-constraint-changed", subject: name, detail: `\`${name}\` constraints changed\n    was: ${prev.constraints}\n    now: ${cur.constraints}`, touches: touchesFor(pin, "field", name, artifactDefault) });
    }
  }
  for (const [name] of pf) {
    if (!of_.has(name)) material.push({ kind: "field-removed", subject: name, detail: `frontmatter field \`${name}\` no longer appears in the field table`, touches: touchesFor(pin, "field", name, artifactDefault) });
  }

  const pd = byKey(pinned.directories ?? [], "entry");
  const od = byKey(observed.directories ?? [], "entry");
  for (const [entry, cur] of od) {
    const prev = pd.get(entry);
    if (!prev) {
      material.push({ kind: "directory-added", subject: entry, detail: `new component entry \`${entry}\` (required: ${cur.required})`, touches: touchesFor(pin, "directory", entry, artifactDefault, true) });
    } else if (prev.required !== cur.required) {
      material.push({ kind: "directory-required-changed", subject: entry, detail: `\`${entry}\` moved from required=${prev.required} to required=${cur.required}`, touches: touchesFor(pin, "directory", entry, artifactDefault) });
    }
  }
  for (const [entry] of pd) {
    if (!od.has(entry)) material.push({ kind: "directory-removed", subject: entry, detail: `component entry \`${entry}\` no longer appears in the directory structure`, touches: touchesFor(pin, "directory", entry, artifactDefault) });
  }

  const ps = byKey(pinned.sections ?? [], "key");
  const os = byKey(observed.sections ?? [], "key");
  for (const [key, cur] of os) {
    const prev = ps.get(key);
    if (!prev) {
      material.push({ kind: "section-added", subject: key, detail: `new specification section "${key}" (${cur.lines} lines)`, touches: touchesFor(pin, "section", key, artifactDefault, true) });
    } else if (prev.hash !== cur.hash) {
      review.push({ kind: "section-body-changed", subject: key, detail: `the body of "${key}" changed (${prev.hash} -> ${cur.hash}); read the diff and decide whether it is normative`, touches: touchesFor(pin, "section", key, artifactDefault) });
    }
  }
  for (const [key] of ps) {
    if (!os.has(key)) material.push({ kind: "section-removed", subject: key, detail: `specification section "${key}" was removed`, touches: touchesFor(pin, "section", key, artifactDefault) });
  }

  return { material, review };
}

/* ---------------------------------------------------------------- report */

/**
 * Build the full watch report from the pin plus the observed artifact bytes.
 * @param {object} args
 * @param {string} args.root plugin root (for the reqId join)
 * @param {object} args.pin  the validated pin document
 * @param {Map<string,{bytes:Buffer,text:string}>} args.observed keyed by artifact path
 */
export function buildReport({ root, pin, observed }) {
  const index = reqIdIndex(root);
  const artifacts = [];
  let material = [];
  let review = [];
  const cosmetic = [];

  for (const a of pin.artifacts) {
    const got = observed.get(a.path);
    if (!got) refuse(`artifact "${a.path}" was not fetched; a partial run cannot report "no change"`, "fetch-incomplete");
    const blobSha = gitBlobSha(got.bytes);
    const changed = blobSha !== a.blobSha;
    const entry = { path: a.path, role: a.role ?? "unspecified", structural: a.structural === true, pinnedBlobSha: a.blobSha, observedBlobSha: blobSha, changed };
    artifacts.push(entry);

    if (!changed) continue;

    if (a.structural === true) {
      if (!pin.surface) refuse(`the pin marks "${a.path}" structural but records no surface, so there is nothing to diff against; bootstrap it with --emit-pin`, "bad-pin");
      const surface = extractSurface(got.text);
      entry.surface = surface;
      const d = diffSurface(pin.surface, surface, pin, a.touches);
      material = material.concat(d.material.map((x) => ({ ...x, artifact: a.path })));
      review = review.concat(d.review.map((x) => ({ ...x, artifact: a.path })));
      if (d.material.length === 0 && d.review.length === 0) {
        cosmetic.push({ kind: "bytes-changed-surface-identical", artifact: a.path, detail: `${a.path} bytes moved (${a.blobSha.slice(0, 12)} -> ${blobSha.slice(0, 12)}) but the extracted surface is identical; page metadata or whitespace only` });
      }
    } else {
      // We do not parse the reference implementation. A change there is always a human read.
      review.push({ kind: "artifact-changed", artifact: a.path, subject: a.path, detail: `${a.role ?? "watched artifact"} \`${a.path}\` changed (${a.blobSha.slice(0, 12)} -> ${blobSha.slice(0, 12)}). This tool does not parse it; read the upstream diff.`, touches: a.touches ?? [] });
    }
  }

  const reqIds = [...new Set([...material, ...review].flatMap((d) => d.touches ?? []))].sort();
  const impacts = reqIds.map((r) => index.get(r) ?? { reqId: r, module: "(unmapped)", what: "no row in docs/reference/universal-checks.md", standardSection: "", tier: "", since: "", provenance: "" });
  const unmappedDeltas = [...material, ...review].filter((d) => (d.touches ?? []).length === 0);

  const verdict = material.length > 0 ? "material-change"
    : review.length > 0 ? "needs-review"
    : cosmetic.length > 0 ? "cosmetic-only"
    : "unchanged";

  return {
    schema: "askit-standards-watch-report/1",
    generatedAt: new Date().toISOString().slice(0, 10),
    upstream: pin.upstream,
    pinnedAt: pin.verified ?? null,
    verdict,
    artifacts,
    material,
    review,
    cosmetic,
    impacts,
    unmappedDeltas,
    // Restated in every machine report so a consumer cannot mistake this for a verdict on the Standard.
    limits: [
      "Detection is deterministic; materiality of a prose change is not. A section-body change is reported, never classified.",
      "The reference implementation (skills-ref) is watched by content hash only; its diff is not parsed.",
      "This tool proposes. Amending a check or STANDARD.md requires an ADR and the sec 7.7 warn-first burndown.",
    ],
  };
}

/** Exit code for a report: 0 unchanged or cosmetic, 1 something a human must look at. */
export function exitCodeFor(report) {
  return report.verdict === "material-change" || report.verdict === "needs-review" ? 1 : 0;
}

/* --------------------------------------------------------------- renderers */

const bullet = (d) => `  - [${d.kind}] ${d.subject ?? d.artifact}\n    ${String(d.detail).replace(/\n/g, "\n    ")}\n    touches: ${(d.touches ?? []).length > 0 ? d.touches.join(", ") : "no check encodes this today"}`;

/** The human report. */
export function renderReport(report) {
  const L = [];
  L.push(`upstream standards watch - ${report.upstream.id ?? report.upstream.repo}`);
  L.push(`pin verified ${report.pinnedAt?.date ?? "(unrecorded)"} | run ${report.generatedAt}`);
  L.push("");
  L.push(`VERDICT: ${report.verdict}`);
  L.push("");
  L.push("Watched artifacts");
  for (const a of report.artifacts) {
    L.push(`  ${a.changed ? "CHANGED  " : "unchanged"} ${a.path}  (${a.pinnedBlobSha.slice(0, 12)}${a.changed ? ` -> ${a.observedBlobSha.slice(0, 12)}` : ""})`);
  }
  if (report.material.length > 0) {
    L.push("");
    L.push(`Material deltas (${report.material.length}) - decided structurally, no judgment applied`);
    report.material.forEach((d) => L.push(bullet(d)));
  }
  if (report.review.length > 0) {
    L.push("");
    L.push(`Needs a human read (${report.review.length}) - located, deliberately NOT classified`);
    report.review.forEach((d) => L.push(bullet(d)));
  }
  if (report.cosmetic.length > 0) {
    L.push("");
    L.push(`Cosmetic (${report.cosmetic.length}) - filtered, listed for completeness`);
    report.cosmetic.forEach((d) => L.push(`  - ${d.detail}`));
  }
  if (report.impacts.length > 0) {
    L.push("");
    L.push("Checks a delta lands on (resolved from docs/reference/universal-checks.md)");
    for (const i of report.impacts) {
      L.push(`  ${i.reqId}  ${i.module}`);
      L.push(`      ${i.what}`);
      L.push(`      Standard ${i.standardSection || "(unmapped)"} | tier ${i.tier || "?"} | since ${i.since || "?"} | ${i.provenance || "?"}`);
    }
  }
  if (report.unmappedDeltas.length > 0) {
    L.push("");
    L.push(`Deltas no check covers (${report.unmappedDeltas.length}) - the gap list, and the most interesting output here`);
    report.unmappedDeltas.forEach((d) => L.push(`  - [${d.kind}] ${d.subject ?? d.artifact}`));
  }
  L.push("");
  L.push("Limits");
  report.limits.forEach((l) => L.push(`  - ${l}`));
  L.push("");
  L.push(report.verdict === "unchanged" || report.verdict === "cosmetic-only"
    ? "No proposal to make. Re-run after the next upstream release, or refresh the verified date with --emit-pin."
    : "Next: draft the proposal with --adr-draft, have a human complete the judgment sections, and open it as Proposed. Do not edit a check or STANDARD.md from this run.");
  return L.join("\n");
}

/**
 * The ADR skeleton. Deterministic sections are filled; every judgment section is left as an explicit
 * TO BE COMPLETED marker, because filling them from a diff is the overclaim this tool exists to avoid.
 * Returned as a string: nothing here writes it anywhere.
 */
export function renderAdrDraft(report, { number = "NNNN", date = report.generatedAt } = {}) {
  const deltas = [...report.material, ...report.review];
  const title = report.material.length > 0
    ? "track the agentskills.io upstream change in the Universal tier"
    : "assess the agentskills.io upstream change against the Universal tier";
  const L = [];
  L.push(`# ${number} - ${title}`);
  L.push("");
  L.push("## TL;DR");
  L.push("- **Decision:** TO BE COMPLETED - what the Universal tier does about the upstream change.");
  L.push(`- **Why:** STANDARD.md sec 6 requires the Universal tier to track agentskills.io; ${report.material.length} material and ${report.review.length} review-level deltas were detected against the pin verified ${report.pinnedAt?.date ?? "(unrecorded)"}.`);
  L.push("- **Status:** Proposed.");
  L.push("");
  L.push("- **Status:** Proposed");
  L.push(`- **Date:** ${date}`);
  L.push("- **Deciders:** TO BE COMPLETED");
  L.push("");
  L.push("## Context and problem statement");
  L.push("");
  L.push(`STANDARD.md sec 6 states, normatively, that where agentskills.io evolves the Universal tier MUST track it. \`${PIN_REL}\` pins the upstream revision the Universal tier is written against. A watch run on ${report.generatedAt} found the pin out of date.`);
  L.push("");
  L.push("Watched artifacts:");
  L.push("");
  L.push("| Artifact | Role | Pinned blob | Observed blob | Changed |");
  L.push("|---|---|---|---|---|");
  for (const a of report.artifacts) {
    L.push(`| \`${a.path}\` | ${a.role} | \`${a.pinnedBlobSha.slice(0, 12)}\` | \`${a.observedBlobSha.slice(0, 12)}\` | ${a.changed ? "yes" : "no"} |`);
  }
  L.push("");
  L.push("Detected deltas:");
  L.push("");
  L.push("| Class | Kind | Subject | Checks it lands on |");
  L.push("|---|---|---|---|");
  for (const d of report.material) L.push(`| material | ${d.kind} | ${escapeMdCell(d.subject ?? d.artifact)} | ${(d.touches ?? []).join(", ") || "none today" } |`);
  for (const d of report.review) L.push(`| review | ${d.kind} | ${escapeMdCell(d.subject ?? d.artifact)} | ${(d.touches ?? []).join(", ") || "none today"} |`);
  if (deltas.length === 0) L.push("| (none) | | | |");
  L.push("");
  L.push("Every `review` row is a located change whose materiality the watcher did not judge. Resolve each one in this ADR by reading the upstream diff.");
  L.push("");
  L.push("## Decision drivers");
  L.push("");
  L.push("- sec 6: the Universal tier MUST track agentskills.io; higher tiers stay this Standard's domain.");
  L.push("- sec 7.7: a new or tightened requirement ships as a `warn` for one Standard MINOR, then becomes an `error`. A relaxation is always safe and needs no burndown.");
  L.push("- The Universal tier is the portability floor: a requirement that upstream does not impose does not belong in it.");
  L.push("");
  L.push("## Considered options");
  L.push("");
  L.push("1. **Track the change** - amend or add the affected check, bump the Standard MINOR, ship the tightening as a `warn` per sec 7.7.");
  L.push("2. **Re-pin only** - record the new upstream revision without changing any requirement, because the delta is not normative for us.");
  L.push("3. **Defer** - leave the pin in place and record why, with a date to revisit.");
  L.push("");
  L.push("## Decision outcome");
  L.push("");
  L.push("TO BE COMPLETED - the chosen option and why it beats the alternatives. State explicitly, per delta, whether it changes a requirement.");
  L.push("");
  L.push("## Consequences");
  L.push("");
  L.push("TO BE COMPLETED - including the burndown schedule for any tightening, and the re-pinned value for `" + PIN_REL + "` (produce it with `npm run standards-watch -- --emit-pin`).");
  L.push("");
  return L.join("\n");
}

/**
 * The proposed re-pinned document, RETURNED for a human to review and commit. Carries the observed
 * blob SHAs and the freshly extracted surface; preserves every human-authored field (touches, notes,
 * roles) untouched. The re-pin is a reviewed file change in a pull request, never a side effect.
 */
export function emitPin(pin, observed, { date = new Date().toISOString().slice(0, 10), by = "unrecorded", repoHeadSha = null } = {}) {
  const next = structuredClone(pin);
  next.verified = { ...(pin.verified ?? {}), date, by };

  // A verification fact this run did not establish is DROPPED, never inherited (backlog E25).
  // Spreading the previous `verified` block used to carry the old `repoHeadSha` forward while every
  // blob SHA around it was refreshed, so the emitted document asserted a verification at a commit
  // nobody checked. Observed 2026-08-11: the proposal offered a 15-day-old HEAD beside a `by` field
  // reading the literal string "unrecorded". This file exists so a reviewer can verify it by hand,
  // offline, without trusting this tool; a stale fact inside `verified` defeats exactly that.
  // Omitting is always safe, inheriting is not.
  if (repoHeadSha) next.verified.repoHeadSha = repoHeadSha;
  else delete next.verified.repoHeadSha;
  for (const a of next.artifacts) {
    const got = observed.get(a.path);
    if (!got) refuse(`cannot re-pin: artifact "${a.path}" was not fetched`, "fetch-incomplete");
    a.blobSha = gitBlobSha(got.bytes);
    if (a.structural === true) next.surface = extractSurface(got.text);
  }
  return next;
}
