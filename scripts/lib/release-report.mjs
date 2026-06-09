// what-it-is:   the release-readiness report object builder
// what-it-does: decorates the evaluate() conformance object with a deterministic go / no-go release readiness verdict
// why:          askit-release needs a shareable readiness report; it reuses the one report renderer via reportType "release" (E1)
// used-by:      scripts/evaluate.mjs (--report=release) and the askit-release skill
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { evaluate } from "../evaluate.mjs";
import { gateExitFromFindings } from "../check.mjs";
import { readJsonSafe } from "./fs-utils.mjs";

const effSev = (f) => f.effectiveSeverity ?? f.severity;
// The version-bearing manifests the release.yml guard enforces (the tag must equal every one of them).
const VERSION_FILES = ["library.json", "package.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json"];

/** Pure: go iff the gate is clean AND release notes are present AND the version-bearing manifests agree. */
export function computeGoNoGo({ gateExit, notesPresent, versionConsistent }) {
  return gateExit === 0 && notesPresent && versionConsistent ? "go" : "no-go";
}

// Mirror the release.yml version-consistency guard: every version-bearing manifest must be present and equal.
function checkVersionConsistency(target) {
  const versions = {};
  const missing = [];
  for (const f of VERSION_FILES) {
    const p = path.join(target, f);
    if (!existsSync(p)) { missing.push(f); continue; }
    versions[f] = readJsonSafe(p).data?.version ?? null;
  }
  const present = Object.values(versions);
  const allEqual = present.length > 0 && present.every((v) => v != null && v === present[0]);
  const ok = allEqual && missing.length === 0;
  let detail;
  if (missing.length) detail = `missing version-bearing manifest(s): ${missing.join(", ")}`;
  else if (allEqual) detail = `all version-bearing manifests at ${present[0]}`;
  else detail = "version mismatch: " + VERSION_FILES.map((f) => `${f}=${versions[f] ?? "?"}`).join(", ");
  return { ok, detail };
}

function readNotesSummary(target) {
  const p = path.join(target, "RELEASE-NOTES.md");
  if (!existsSync(p)) return null;
  try {
    const heading = readFileSync(p, "utf8").split(/\r?\n/).find((l) => /^##\s+\d+\.\d+\.\d+/.test(l));
    return heading ? heading.replace(/^##\s+/, "").trim() : null;
  } catch {
    return null;
  }
}

export function releaseReport(target, opts = {}) {
  const base = evaluate(target, opts);
  const declared = readJsonSafe(path.join(target, "library.json")).data?.tier;
  const forGate = (base.findings ?? []).filter((f) => !f.suppressed).map((f) => ({ ...f, severity: effSev(f) }));
  const { exitCode: gateExit } = gateExitFromFindings(forGate, declared);
  const notesPresent = existsSync(path.join(target, "RELEASE-NOTES.md"));
  const versionConsistency = checkVersionConsistency(target);
  const goNoGo = computeGoNoGo({ gateExit, notesPresent, versionConsistent: versionConsistency.ok });
  return { ...base, reportType: "release", release: { goNoGo, gateExit, versionConsistency, notesPresent, summary: readNotesSummary(target) } };
}
