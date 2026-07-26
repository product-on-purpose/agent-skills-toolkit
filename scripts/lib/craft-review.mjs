// what-it-is:   the craft-review partitioner and consent-gated applier (SP1, ADR 0037)
// what-it-does: splits the craft review's findings into a mechanically SAFE subset and a JUDGMENT
//               remainder, applies ONLY the SAFE subset on explicit consent, and shapes the whole set
//               for the evaluate.mjs --report=review advisory path so it renders beside the verdict
// why:          the craft findings are model-authored and untrusted; a CLOSED allowlist that fails
//               toward "do not touch" is what makes an auto-apply safe, and routing the render through
//               the existing advisory seam is what keeps the layer unable to move the gate verdict
// used-by:      the askit-build-skill improve-mode phase 2; tests/unit/craft-review.test.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * The CLOSED SAFE allowlist. A craft finding is SAFE only if its category is one of these EXACT
 * tokens AND it carries a complete, bounded fix descriptor (see classifyCraftFinding). Every other
 * category - including one nobody has thought of yet - is JUDGMENT. Widening this list is an ADR
 * decision, not a code tweak, which is why it is frozen.
 */
export const SAFE_CATEGORIES = Object.freeze(["broken-link", "formatting", "missing-frontmatter-field"]);

/**
 * The closed set of frontmatter fields a SAFE fix may ADD. Every entry is a mechanical bookkeeping
 * field whose correct value is dictated by the Standard or by the surrounding manifest. `name` and
 * `description` are deliberately absent: they carry identity and trigger quality, which is authored
 * meaning and therefore always a JUDGMENT call (the description is itself a rubric dimension).
 */
export const SAFE_FRONTMATTER_FIELDS = Object.freeze(["metadata.version", "metadata.tier", "metadata.audience", "metadata.status"]);

/** A SAFE literal substitution is bounded: single-line and no longer than this on either side. */
export const MAX_SAFE_EDIT_CHARS = 200;

/** The fix `kind` each SAFE category must declare. A mismatch is JUDGMENT (fail closed). */
const KIND_BY_CATEGORY = Object.freeze({
  "broken-link": "replace",
  formatting: "replace",
  "missing-frontmatter-field": "add-frontmatter-field",
});

/** Lexical normalization only: trim plus lowercase, which cannot change WHICH token was named. */
const normalizeCategory = (c) => (typeof c === "string" ? c.trim().toLowerCase() : null);

const isBoundedLiteral = (s) =>
  typeof s === "string" && s.length > 0 && s.length <= MAX_SAFE_EDIT_CHARS && !/[\r\n]/.test(s);

/**
 * True only for a relative path that stays inside the graded subject. An absolute path, a drive
 * letter, or any `..` segment is refused: a mechanical auto-apply must not be able to write outside
 * the skill it was invoked on, whatever the model wrote in the finding.
 */
function isContainedRelativePath(p) {
  if (typeof p !== "string" || p.trim() === "") return false;
  const n = p.replace(/\\/g, "/");
  if (n.startsWith("/") || /^[a-zA-Z]:/.test(n)) return false;
  return !n.split("/").includes("..");
}

/**
 * Classify ONE craft finding. Returns `{ disposition: "safe"|"judgment", category, reason }`, where
 * the reason is always stated so a JUDGMENT finding can say why it was not auto-applied.
 *
 * The rules run in order and every one of them fails toward JUDGMENT:
 *  1. the finding must be a non-null, non-array object;
 *  2. its category must normalize to an EXACT member of SAFE_CATEGORIES;
 *  3. its `file` must be a contained relative path;
 *  4. its `fix.kind` must be the kind that category owns;
 *  5. the fix payload must be complete and bounded (a single-line literal within the cap, or an
 *     allowlisted frontmatter field with a non-empty single-line value).
 */
export function classifyCraftFinding(f) {
  if (f === null || typeof f !== "object" || Array.isArray(f)) {
    return { disposition: "judgment", category: null, reason: "the finding is not an object, so nothing about it can be verified" };
  }
  const category = normalizeCategory(f.category);
  if (category === null) {
    return { disposition: "judgment", category: null, reason: "the finding declares no category, so it cannot be matched against the SAFE allowlist" };
  }
  if (!SAFE_CATEGORIES.includes(category)) {
    return { disposition: "judgment", category, reason: `category "${category}" is not on the SAFE allowlist (${SAFE_CATEGORIES.join(", ")})` };
  }
  if (!isContainedRelativePath(f.file)) {
    return { disposition: "judgment", category, reason: `the fix target ${JSON.stringify(f.file ?? null)} is not a relative path inside the subject` };
  }
  const fix = f.fix;
  if (fix === null || typeof fix !== "object" || Array.isArray(fix)) {
    return { disposition: "judgment", category, reason: "the finding carries no fix descriptor, so there is nothing to apply mechanically" };
  }
  const expectedKind = KIND_BY_CATEGORY[category];
  if (fix.kind !== expectedKind) {
    return { disposition: "judgment", category, reason: `a ${category} fix must declare kind "${expectedKind}"; got ${JSON.stringify(fix.kind ?? null)}` };
  }
  if (expectedKind === "replace") {
    if (!isBoundedLiteral(fix.from) || !isBoundedLiteral(fix.to)) {
      return { disposition: "judgment", category, reason: `a SAFE edit is a bounded single-line literal substitution (both sides non-empty, no newline, at most ${MAX_SAFE_EDIT_CHARS} characters)` };
    }
    if (fix.from === fix.to) {
      return { disposition: "judgment", category, reason: "the substitution is a no-op (from equals to)" };
    }
    return { disposition: "safe", category, reason: `a bounded single-line ${category} substitution in ${f.file}` };
  }
  // add-frontmatter-field
  if (typeof fix.field !== "string" || !SAFE_FRONTMATTER_FIELDS.includes(fix.field)) {
    return { disposition: "judgment", category, reason: `frontmatter field ${JSON.stringify(fix.field ?? null)} is not on the SAFE field allowlist (${SAFE_FRONTMATTER_FIELDS.join(", ")})` };
  }
  if (!isBoundedLiteral(fix.value)) {
    return { disposition: "judgment", category, reason: `the value for ${fix.field} must be a non-empty single-line scalar within ${MAX_SAFE_EDIT_CHARS} characters` };
  }
  return { disposition: "safe", category, reason: `adds the missing bookkeeping field ${fix.field} in ${f.file}` };
}

/**
 * Partition a craft-review finding set. Returns the two buckets plus `decisions`: one record per
 * input, in input order, carrying the original finding, its disposition, and the stated reason - so
 * the durable report can say why each JUDGMENT finding was left alone. A non-array input yields two
 * empty buckets rather than throwing (a malformed advisory degrades, it does not crash the flow).
 */
export function partitionCraftFindings(findings) {
  const list = Array.isArray(findings) ? findings : [];
  const safe = [];
  const judgment = [];
  const decisions = [];
  for (const finding of list) {
    const { disposition, category, reason } = classifyCraftFinding(finding);
    decisions.push({ finding, disposition, category, reason });
    (disposition === "safe" ? safe : judgment).push(finding);
  }
  return { safe, judgment, decisions };
}

/**
 * Is phase 2 (the craft review) allowed to be OFFERED? Only when the deterministic gate is already
 * clean, so the craft pass never becomes a way to route around a conformance failure. Eligibility is
 * permission to OFFER; running still requires the user's explicit opt-in, and applying still requires
 * consent (applySafeFixes). An unknown or inconsistent gate result is not clean.
 * @param {{exitCode?:number, errors?:number, warns?:number}} gate
 */
export function phaseTwoEligible(gate) {
  const g = gate && typeof gate === "object" ? gate : {};
  if (g.exitCode !== 0) {
    return { eligible: false, reason: `the deterministic gate is not clean (exit code ${JSON.stringify(g.exitCode ?? null)}); resolve the gate findings in phase 1 first` };
  }
  if (typeof g.errors === "number" && g.errors > 0) {
    return { eligible: false, reason: `the gate reports exit 0 with ${g.errors} error(s), which is inconsistent; treat it as not clean and re-run the gate` };
  }
  return { eligible: true, reason: "the deterministic gate is clean, so the craft review may be OFFERED (it still runs only on explicit opt-in)" };
}

/** The file's dominant line ending, so an inserted line does not mix CRLF and LF on Windows. */
const eolOf = (text) => (text.includes("\r\n") ? "\r\n" : "\n");

/** Apply one bounded literal substitution. Refuses on absent or ambiguous matches. */
function applyReplace(abs, fix) {
  const text = readFileSync(abs, "utf8");
  const occurrences = text.split(fix.from).length - 1;
  if (occurrences === 0) return { ok: false, reason: `the literal to replace was not found in the file` };
  if (occurrences > 1) return { ok: false, reason: `the literal occurs ${occurrences} times in the file (ambiguous); a SAFE apply never guesses which occurrence was meant` };
  // A FUNCTION replacement, so `to` is inserted literally: a string replacement would give `$&`, `` $` ``
  // and friends their special meaning and let a model-authored payload inject surrounding text.
  writeFileSync(abs, text.replace(fix.from, () => fix.to));
  return { ok: true };
}

/**
 * Insert one missing `metadata.<leaf>` field into the frontmatter block, textually (so the rest of
 * the block keeps its formatting rather than being re-serialized). Refuses when there is no
 * frontmatter block, or when a key of that name already appears in the block - the category is
 * MISSING-frontmatter-field, so overwriting an existing value is out of scope by construction. The
 * already-present test scans the whole block, which is deliberately broad: a top-level `version:`
 * blocks a `metadata.version` insert. Refusing is the fail-closed direction.
 */
function applyAddFrontmatterField(abs, fix) {
  const text = readFileSync(abs, "utf8");
  const eol = eolOf(text);
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") return { ok: false, reason: "the file has no frontmatter block to add a field to" };
  const close = lines.indexOf("---", 1);
  if (close < 0) return { ok: false, reason: "the frontmatter block is not closed, so it cannot be edited safely" };
  const [parent, leaf] = fix.field.split(".");
  const block = lines.slice(1, close);
  if (block.some((l) => new RegExp(`^\\s*${leaf}\\s*:`).test(l))) {
    return { ok: false, reason: `${fix.field} is already present in the frontmatter; this category only ADDS a missing field` };
  }
  const parentIdx = block.findIndex((l) => new RegExp(`^${parent}\\s*:\\s*$`).test(l));
  // An INLINE parent map (`metadata: {version: 1}`) is present but not line-editable; appending a second
  // `metadata:` key would write duplicate YAML keys. Refuse instead (fail closed).
  if (parentIdx < 0 && block.some((l) => new RegExp(`^${parent}\\s*:`).test(l))) {
    return { ok: false, reason: `the ${parent} map is written inline, so a field cannot be inserted into it without rewriting the block` };
  }
  const insertAt = parentIdx >= 0 ? 1 + parentIdx + 1 : close;
  const inserted = parentIdx >= 0 ? [`  ${leaf}: ${fix.value}`] : [`${parent}:`, `  ${leaf}: ${fix.value}`];
  lines.splice(insertAt, 0, ...inserted);
  writeFileSync(abs, lines.join(eol));
  return { ok: true };
}

/**
 * Apply ONLY the SAFE subset of a craft finding set, and only with explicit consent.
 *
 * Two guards, both load-bearing:
 *  - consent must be exactly `true`. Anything else (absent, false, "yes", 1) writes nothing.
 *  - every finding is RE-CLASSIFIED here. The applier does not trust the caller's partition, so a
 *    JUDGMENT finding handed to it is refused rather than applied (defense in depth).
 *
 * Returns `{ applied, skipped }` where each entry names the finding and, for a skip, the reason.
 * Nothing is silent: a refused fix is reported, never dropped.
 * @param {string} root the graded subject's directory (the one root findings are relative to)
 */
export function applySafeFixes(root, findings, opts) {
  const list = Array.isArray(findings) ? findings : [];
  const consent = opts && typeof opts === "object" ? opts.consent : undefined;
  if (consent !== true) {
    return { applied: [], skipped: list.map((finding) => ({ finding, reason: "consent was not given (consent must be exactly true); nothing was written" })) };
  }
  const applied = [];
  const skipped = [];
  for (const finding of list) {
    const { disposition, reason } = classifyCraftFinding(finding);
    if (disposition !== "safe") {
      skipped.push({ finding, reason: `not SAFE: ${reason}` });
      continue;
    }
    // Normalize separators so a Windows-style path in a model-authored finding resolves the same way on
    // every platform, then re-assert containment at the WRITE site: the classifier already refused
    // absolute and `..` paths, and this is the belt that makes a write outside the subject unreachable
    // even if a future classifier change let one through.
    const rel = finding.file.replace(/\\/g, "/");
    const abs = path.resolve(root, rel);
    if (abs !== path.resolve(root) && !abs.startsWith(path.resolve(root) + path.sep)) {
      skipped.push({ finding, reason: `the resolved target ${rel} is outside the subject directory` });
      continue;
    }
    if (!existsSync(abs)) {
      skipped.push({ finding, reason: `the target file ${rel} does not exist` });
      continue;
    }
    let result;
    try {
      result = finding.fix.kind === "replace" ? applyReplace(abs, finding.fix) : applyAddFrontmatterField(abs, finding.fix);
    } catch (e) {
      result = { ok: false, reason: `writing ${finding.file} failed: ${e.message}` };
    }
    if (result.ok) applied.push({ finding });
    else skipped.push({ finding, reason: result.reason });
  }
  return { applied, skipped };
}

/**
 * Shape a craft finding set as the advisory block `evaluate.mjs --report=review --advisory <file>`
 * consumes, so the craft review renders through the EXISTING advisory path (a durable MD plus HTML
 * artifact) rather than as ephemeral chat output. Every finding is carried, labeled with its
 * disposition, and a JUDGMENT finding states why it was not auto-applied.
 *
 * The layer is advisory by construction: applyAdvisory() in evaluate.mjs allowlists only its own
 * namespaced keys (reportType / review / insights), so nothing here can reach report.findings, the
 * summary, the tier, or the gate exit code.
 */
export function toReviewAdvisory(findings, meta) {
  const m = meta && typeof meta === "object" ? meta : {};
  const { safe, judgment, decisions } = partitionCraftFindings(findings);
  return {
    review: {
      model: String(m.model ?? ""),
      effort: String(m.effort ?? ""),
      date: String(m.date ?? ""),
      findings: decisions.map(({ finding, disposition, reason }) => {
        const f = finding && typeof finding === "object" ? finding : {};
        const tag = disposition === "safe" ? "[SAFE]" : "[JUDGMENT]";
        const tail = disposition === "safe" ? "" : ` (not auto-applied: ${reason})`;
        return {
          area: String(f.dimension ?? f.area ?? "craft"),
          severity: String(f.severity ?? "minor"),
          file: f.file ?? null,
          provenance: String(f.provenance ?? "house-preference"),
          message: `${tag} ${String(f.message ?? "(no message)")}${tail}`,
        };
      }),
    },
    insights: [
      `Craft review: ${safe.length} mechanically SAFE finding(s) offered for a consent-gated apply, ${judgment.length} JUDGMENT finding(s) reported for your call. SAFE is a closed allowlist; anything else is JUDGMENT by default. This layer is advisory and never moves the gate verdict.`,
    ],
  };
}
