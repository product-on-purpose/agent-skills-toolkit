// what-it-is:   the gate config loader (F3)
// what-it-does: reads the optional askit.config.json at the plugin root, validates it, and returns a frozen
//               { mode, profile, rules, suppressions } with every default filled in, plus any config
//               validation findings (a bad config is surfaced as findings, never thrown)
// why:          per-rule severity/enable, profiles, suppressions, and a published-verdict mode make the
//               deterministic gate a framework for a team's own house rules (linter-vs-judge note); reading
//               once and freezing keeps the gate model-free and the no-config path byte-identical to before
// used-by:      scripts/check.mjs, scripts/evaluate.mjs, scripts/tier-report.mjs (via resolve-config.mjs)
import path from "node:path";
import { readJsonSafe } from "./fs-utils.mjs";
import { finding, SEVERITY } from "./findings.mjs";
import { PROFILES } from "./profiles.mjs";
import { REQ_IDS } from "./registry.mjs";

export const CONFIG_FILENAME = "askit.config.json";
const SEVERITIES = new Set(["error", "warn", "off"]);
const MODES = new Set(["local", "published-verdict"]);

/**
 * CONFIG PROVENANCE (ADR 0044, W1a). Every resolved setting carries who chose it, because the
 * published-verdict trust step has to distinguish a rubric the GRADER selected from one the SUBJECT
 * wrote about itself, and by the time the resolver ran those were indistinguishable: check.mjs and
 * evaluate.mjs each merged CLI options into one flat object.
 *
 *   grader   - supplied by the caller as an option (`--mode`, `--profile`, and any future flag). In the
 *              marketplace scope the caller's options are grader-owned for every member.
 *   subject  - read from the target's own askit.config.json, including its `profile` key. Under
 *              ADR 0034 each marketplace member's config is rooted at that member's own directory, so
 *              it is that member's subject-owned config: grading a catalogue does not make the grader
 *              the owner of a member's file.
 *   default  - nobody chose it. Deliberately a third category rather than an owner, because the trust
 *              step only ever acts on a setting that LOWERS a finding and a default lowers nothing:
 *              the default `rules` is empty and the default profile is the identity profile. The
 *              malformed-config fallback is the same, and so is a value the subject wrote that failed
 *              validation - we did not honour it, so the subject does not own the value in force.
 */
export const ORIGIN = Object.freeze({ GRADER: "grader", SUBJECT: "subject", DEFAULT: "default" });

// The no-config default: a strict no-op. profile is the identity profile; local mode applies every
// override as written (the clamp is inert). Frozen so a caller cannot mutate the shared default.
export const DEFAULT_CONFIG = Object.freeze({
  mode: Object.freeze({ value: "local", origin: ORIGIN.DEFAULT }),
  profile: Object.freeze({ value: "askit-library", origin: ORIGIN.DEFAULT }),
  rules: Object.freeze({}),
  suppressions: Object.freeze([]),
});

/** A rule value may be a bare string ("warn") or an object ({ severity: "warn" }); extract the severity. */
function severityOf(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.severity;
  return undefined;
}

function normalize(data, findings) {
  const push = (msg) => findings.push(finding("config", SEVERITY.WARN, msg, { file: CONFIG_FILENAME, reqId: null }));

  // A rejected value keeps the DEFAULT's origin, not the subject's: the subject wrote something, but it
  // is not the value in force, and stamping it `subject` would let a malformed config claim ownership of
  // a setting it never successfully chose.
  let mode = DEFAULT_CONFIG.mode;
  if (data.mode !== undefined) {
    if (MODES.has(data.mode)) mode = { value: data.mode, origin: ORIGIN.SUBJECT };
    else push(`unknown mode '${data.mode}'; using 'local' (one of: ${[...MODES].join(", ")})`);
  }

  let profile = DEFAULT_CONFIG.profile;
  if (data.profile !== undefined) {
    if (Object.prototype.hasOwnProperty.call(PROFILES, data.profile)) profile = { value: data.profile, origin: ORIGIN.SUBJECT };
    else push(`unknown profile '${data.profile}'; using 'askit-library'`);
  }

  const rules = {};
  if (data.rules && typeof data.rules === "object") {
    for (const [key, raw] of Object.entries(data.rules)) {
      if (!REQ_IDS.has(key)) { push(`unknown rule id '${key}' in config.rules; ignored`); continue; }
      const sev = severityOf(raw);
      if (!SEVERITIES.has(sev)) { push(`rule '${key}': '${sev}' is not error/warn/off; ignored`); continue; }
      rules[key] = Object.freeze({ value: sev, origin: ORIGIN.SUBJECT });
    }
  } else if (data.rules !== undefined) {
    push("config.rules must be an object of reqId -> severity; ignored");
  }

  const suppressions = [];
  if (Array.isArray(data.suppressions)) {
    data.suppressions.forEach((s, i) => {
      if (!s || typeof s !== "object" || typeof s.reqId !== "string") {
        push(`suppression #${i} ignored: a string reqId is required`);
        return;
      }
      if (typeof s.reason !== "string" || s.reason.trim() === "") {
        push(`suppression #${i} (${s.reqId}) has no reason; record why a finding is waived`);
      }
      // The origin is stamped ON THE ENTRY, at load time, because matchSuppression returns this very
      // object (suppressions.mjs) and nothing downstream can recover who owned it once matching has
      // happened. There is no second place to look it up from.
      suppressions.push(Object.freeze({ reqId: s.reqId, file: s.file, message: s.message, reason: s.reason, origin: ORIGIN.SUBJECT }));
    });
  } else if (data.suppressions !== undefined) {
    push("config.suppressions must be an array; ignored");
  }

  return Object.freeze({ mode: Object.freeze(mode), profile: Object.freeze(profile), rules: Object.freeze(rules), suppressions: Object.freeze(suppressions) });
}

/**
 * Load and validate the optional askit.config.json. Always returns a usable, frozen config (defaults when
 * absent or fatally malformed) plus the validation findings. Never throws.
 * @returns {{ config: object, findings: Array<object> }}
 */
export function loadConfig(root) {
  const p = path.join(root, CONFIG_FILENAME);
  const { data, parseError } = readJsonSafe(p);
  const findings = [];
  if (parseError) {
    findings.push(finding("config", SEVERITY.ERROR, `${CONFIG_FILENAME} is present but not valid JSON: ${parseError}. Falling back to defaults.`, { file: CONFIG_FILENAME, reqId: null }));
    return { config: DEFAULT_CONFIG, findings };
  }
  if (data === null) return { config: DEFAULT_CONFIG, findings }; // absent => no-op default
  if (typeof data !== "object" || Array.isArray(data)) {
    findings.push(finding("config", SEVERITY.ERROR, `${CONFIG_FILENAME} must be a JSON object. Falling back to defaults.`, { file: CONFIG_FILENAME, reqId: null }));
    return { config: DEFAULT_CONFIG, findings };
  }
  return { config: normalize(data, findings), findings };
}

/**
 * Merge caller-supplied options over a loaded config, stamping them GRADER-owned.
 *
 * This exists as one function rather than one expression per entry point because ownership parity is a
 * requirement of ADR 0044, not an expectation. Five paths build config independently - check.mjs (which
 * the marketplace per-member path routes through), evaluate.mjs plugin scope, evaluate.mjs component
 * scope, and tier-report.mjs - and an implementation that threads origin through one of them passes a
 * gate test while publishing a different verdict from `evaluate`. The four copies of
 * `{ ...config, ...(mode ? {mode} : {}) }` this replaces were already the shape that erased origin.
 *
 * Only a value the caller actually supplied becomes grader-owned; an absent option leaves the loaded
 * setting exactly as it was, so a subject's own `profile` is not silently reattributed to the grader.
 */
export function withGraderOptions(config, { mode, profile } = {}) {
  return Object.freeze({
    ...config,
    ...(mode ? { mode: Object.freeze({ value: mode, origin: ORIGIN.GRADER }) } : {}),
    ...(profile ? { profile: Object.freeze({ value: profile, origin: ORIGIN.GRADER }) } : {}),
  });
}

/**
 * Build an origin-bearing config from plain values, stamping one origin across everything supplied.
 * The inverse of publicConfig(), and the constructor a programmatic caller needs.
 *
 * It exists so the origin-bearing shape is written down ONCE. Before this, three test files each encoded
 * `{ mode: "local", profile: "askit-library", rules: {}, suppressions: [] }` inline, which is precisely
 * how a shape change becomes a scavenger hunt - and ADR 0044 makes ownership parity a requirement rather
 * than something four hand-written copies happen to agree on.
 *
 * @param {{mode?: string, profile?: string, rules?: Record<string,string>, suppressions?: Array<object>}} plain
 * @param {"grader"|"subject"|"default"} origin who chose these settings
 */
export function configFrom(plain = {}, origin = ORIGIN.SUBJECT) {
  const { mode, profile, rules = {}, suppressions = [] } = plain;
  return Object.freeze({
    mode: Object.freeze(mode === undefined ? DEFAULT_CONFIG.mode : { value: mode, origin }),
    profile: Object.freeze(profile === undefined ? DEFAULT_CONFIG.profile : { value: profile, origin }),
    rules: Object.freeze(Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, Object.freeze({ value: v, origin })]))),
    suppressions: Object.freeze(suppressions.map((s) => Object.freeze({ ...s, origin: s.origin ?? origin }))),
  });
}

/**
 * The origin-free projection: exactly the `{ mode, profile, rules, suppressions }` shape that
 * `check.mjs --json` has always published.
 *
 * Provenance is an INTERNAL resolution input, not a new external contract. Publishing the origin-bearing
 * shape instead would silently change the type of `config.rules.<reqId>` from a string to an object for
 * every automation reading the gate's JSON, which W1a is explicitly not permitted to do: it is plumbing,
 * and plumbing that changes a published shape is not plumbing.
 */
export function publicConfig(config) {
  return {
    mode: config.mode.value,
    profile: config.profile.value,
    rules: Object.fromEntries(Object.entries(config.rules).map(([k, v]) => [k, v.value])),
    suppressions: config.suppressions.map(({ origin, ...rest }) => rest),
  };
}
