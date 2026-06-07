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

// The no-config default: a strict no-op. profile is the identity profile; local mode applies every
// override as written (the clamp is inert). Frozen so a caller cannot mutate the shared default.
export const DEFAULT_CONFIG = Object.freeze({
  mode: "local",
  profile: "askit-library",
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

  let mode = DEFAULT_CONFIG.mode;
  if (data.mode !== undefined) {
    if (MODES.has(data.mode)) mode = data.mode;
    else push(`unknown mode '${data.mode}'; using 'local' (one of: ${[...MODES].join(", ")})`);
  }

  let profile = DEFAULT_CONFIG.profile;
  if (data.profile !== undefined) {
    if (Object.prototype.hasOwnProperty.call(PROFILES, data.profile)) profile = data.profile;
    else push(`unknown profile '${data.profile}'; using 'askit-library'`);
  }

  const rules = {};
  if (data.rules && typeof data.rules === "object") {
    for (const [key, raw] of Object.entries(data.rules)) {
      if (!REQ_IDS.has(key)) { push(`unknown rule id '${key}' in config.rules; ignored`); continue; }
      const sev = severityOf(raw);
      if (!SEVERITIES.has(sev)) { push(`rule '${key}': '${sev}' is not error/warn/off; ignored`); continue; }
      rules[key] = sev;
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
      suppressions.push({ reqId: s.reqId, file: s.file, message: s.message, reason: s.reason });
    });
  } else if (data.suppressions !== undefined) {
    push("config.suppressions must be an array; ignored");
  }

  return Object.freeze({ mode, profile, rules: Object.freeze(rules), suppressions: Object.freeze(suppressions) });
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
