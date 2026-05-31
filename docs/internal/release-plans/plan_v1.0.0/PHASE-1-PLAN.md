# Phase 1 - Validation Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic Node script suite (checks, generators, tier-report, aggregate gate, CI) that validates a plugin against `STANDARD.md`, and prove it by self-validating the Phase 0 seed at Bronze.

**Architecture:** Plain ESM Node scripts under `scripts/`. A single `loadPlugin(root)` builds one shared `PluginContext`; each check is a pure function `check(ctx) -> Finding[]` tagged with a tier + requirement ID. A gate runner aggregates findings (fails on any `error`, surfaces `warn`). `tier-report` derives the satisfied tier and a `blocked` to-do list keyed to requirement IDs. Generators emit `INDEX.md`, native manifests, and `manifest.generated.json` from the authored `library.json`. The agentskills.io checks are reimplemented behind a `checkAgentskills` seam (decision Q1.1) so a real `skills-ref` can be swapped in later without touching callers.

**Tech Stack:** Node >= 20 (LTS), ESM (`.mjs`). Test runner: `node:test` + `node:assert/strict` (zero-dep, decision Q1.2). One runtime dependency: `yaml` (frontmatter parsing only). GitHub Actions shells out to scripts only.

---

## Dependencies and conventions (read before Task 1)

- **Inputs from Phase 0:** repo-root `STANDARD.md` (v0.7), the Bronze seed (`library.json`, `AGENTS.md`, `INDEX.md`, etc.). The seed is **golden fixture #0**: the suite must pass it at Bronze.
- **Standard sections this plan implements:** sec 4.2 (required checks by tier), sec 4.5 (severity error/warn + file + remediation), sec 3.1 (skill frontmatter), sec 8.1 (description rubric, 0.7 warn), sec 5.1 (`library.json` schema), sec 2.4 (tier-report format), sec 10.1 (layout), sec 4.4 (local/CI parity).
- **The one dependency call (maintainer may veto):** `yaml` for frontmatter parsing. Reimplementing YAML by hand is error-prone and this is the trust root. `node:test` keeps the *test* layer dependency-free. Alternative if vetoed: a hand-rolled parser restricted to flat `key: value` + one nested map, that emits an `error` finding on anything it cannot parse (fail-safe). Default: use `yaml`.

### Shared type contracts (used by every task; do not rename)

```js
// A single validation result.
// severity: "error" | "warn"
// file: repo-relative path or null
// reqId: requirement id this finding gates (e.g. "U1".."U8", or null)
/** @typedef {{ check: string, severity: "error"|"warn", message: string, file: string|null, reqId: string|null }} Finding */

// Built once by loadPlugin(root), consumed by every check.
/** @typedef {{
 *   root: string,
 *   library: { path: string, data: object|null, parseError: string|null },
 *   agentsMdPath: string|null,
 *   skills: SkillInfo[]
 * }} PluginContext */

// One discovered skill directory.
/** @typedef {{
 *   name: string,            // directory name
 *   dir: string,             // absolute dir path
 *   skillMdPath: string,     // absolute path to SKILL.md
 *   raw: string,             // full SKILL.md text
 *   frontmatter: object|null,// parsed frontmatter (null on parse error)
 *   body: string,            // markdown body after frontmatter
 *   parseError: string|null  // frontmatter parse error message, or null
 * }} SkillInfo */
```

### Requirement-ID map (Universal / Bronze tier, this phase)

| reqId | Requirement | Standard | Check module |
|---|---|---|---|
| U1 | `library.json` present + valid against sec 5.1 schema | 5.1, 2.1 | `checks/library-json.mjs` |
| U2 | `AGENTS.md` present at root | 2.1, 3.10 | `checks/anatomy.mjs` |
| U3 | Skill frontmatter valid YAML + required keys | 3.1 | `checks/frontmatter-valid.mjs` |
| U4 | Skill `name` equals directory name | 3.1 | `checks/name-matches-dir.mjs` |
| U5 | Skill `description` meets the 8.1 bar (warn < 0.7) | 8.1 | `checks/description-score.mjs` |
| U6 | Reference links resolve, one level deep | 3.1 | `checks/reference-links.mjs` |
| U7 | Instruction-budget within range (warn only) | 1, 3.1 | `checks/instruction-budget.mjs` |
| U8 | Repo anatomy follows the Bronze layout subset | 10.1 | `checks/anatomy.mjs` |

`tier: universal` is satisfied when no `error` finding carries a U-reqId. (Convergent/Advanced reqIds arrive in later phases; tier-report already supports them.)

---

## File Structure

```
package.json                      # type:module, engines node>=20, scripts.test/check, dep: yaml
package-lock.json                 # committed
scripts/
  check.mjs                       # aggregate gate runner (entry: node scripts/check.mjs [root])
  tier-report.mjs                 # entry: node scripts/tier-report.mjs [root] [--json]
  lib/
    findings.mjs                  # finding() factory + SEVERITY
    fs-utils.mjs                  # readJsonSafe, fileExists, listSkillDirs, walkFiles
    frontmatter.mjs               # parseFrontmatter(text) -> {frontmatter, body, parseError}
    load-plugin.mjs               # loadPlugin(root) -> PluginContext
    registry.mjs                  # ordered list of all checks + their meta
  checks/
    library-json.mjs              # U1
    anatomy.mjs                   # U2 + U8
    frontmatter-valid.mjs         # U3
    name-matches-dir.mjs          # U4
    description-score.mjs         # U5
    reference-links.mjs           # U6
    instruction-budget.mjs        # U7
    agentskills.mjs               # composes U3-U7 behind the skills-ref seam
    manifest-drift.mjs            # native-manifest vs library.json drift (warn at Bronze)
  generators/
    gen-index.mjs                 # INDEX.md from context
    gen-manifest.mjs              # manifest.generated.json + native manifests from library.json
    sync-agents-md.mjs            # refresh AGENTS.md generated section
tests/
  fixtures/
    golden/minimal-skill/         # a conformant skill (golden)
    anti/bad-frontmatter/         # invalid YAML (anti)
    anti/name-mismatch/           # name != dir (anti)
    anti/weak-description/         # description scores < 0.7 (anti)
    anti/missing-library-json/    # no library.json (anti)
  unit/
    findings.test.mjs
    fs-utils.test.mjs
    frontmatter.test.mjs
    load-plugin.test.mjs
    library-json.test.mjs
    anatomy.test.mjs
    frontmatter-valid.test.mjs
    name-matches-dir.test.mjs
    description-score.test.mjs
    reference-links.test.mjs
    instruction-budget.test.mjs
    agentskills.test.mjs
    tier-report.test.mjs
    check-runner.test.mjs
    gen-index.test.mjs
    gen-manifest.test.mjs
    seed-bronze.test.mjs          # the self-validation: the repo seed passes Bronze
```

---

## Task 0: Spike - confirm `skills-ref` status and lock the YAML approach

**Files:**
- Create: `spikes/2026-05-NN_skills-ref-status.md` (gitignored notes)

- [ ] **Step 1: Investigate.** Run each and record output in the notes file:

```bash
npm view skills version 2>&1 | head -5
npm view @agentskills/skills-ref version 2>&1 | head -5
npx --yes skills --help 2>&1 | head -40
```

- [ ] **Step 2: Decide and record.** In the notes file, answer: does any package expose a `validate`/`lint` command for `SKILL.md` with machine-readable (JSON) findings? If **no** (expected), confirm the plan's decision: reimplement behind `checkAgentskills`. If **yes**, note the command + output shape and add a follow-up task to wrap it behind the same seam. Either way the seam (`checks/agentskills.mjs`) is unchanged.
- [ ] **Step 3: Confirm YAML dependency.** Note whether the maintainer veto on `yaml` was exercised. Default stands: use `yaml`.
- [ ] **Step 4: Commit notes** (gitignored, so this is just a local save - no git step).

Expected outcome: a one-paragraph decision record; no code changes. This retires the only real unknown before any check is written.

---

## Task 1: Project scaffolding + prove the test runner

**Files:**
- Create: `package.json`
- Create: `tests/unit/findings.test.mjs` (temporary smoke test, replaced in Task 2)

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "agent-skills-toolkit",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "node --test",
    "check": "node scripts/check.mjs",
    "tier-report": "node scripts/tier-report.mjs"
  },
  "dependencies": {
    "yaml": "^2.5.0"
  }
}
```

- [ ] **Step 2: Install the dependency**

Run: `npm install`
Expected: creates `node_modules/` (gitignored) and `package-lock.json`. No audit errors that block install.

- [ ] **Step 3: Write a smoke test to prove the runner works**

`tests/unit/findings.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";

test("test runner is wired", () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 4: Run the test**

Run: `npm test`
Expected: PASS, 1 test, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tests/unit/findings.test.mjs
git commit -m "build: Phase 1 scaffolding - package.json, yaml dep, node:test wired"
```

---

## Task 2: `lib/findings.mjs` - the Finding model

**Files:**
- Create: `scripts/lib/findings.mjs`
- Test: `tests/unit/findings.test.mjs` (replace the smoke test)

- [ ] **Step 1: Write the failing test**

`tests/unit/findings.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { finding, SEVERITY } from "../../scripts/lib/findings.mjs";

test("finding() builds a normalized Finding with defaults", () => {
  const f = finding("my-check", SEVERITY.ERROR, "boom");
  assert.deepEqual(f, {
    check: "my-check",
    severity: "error",
    message: "boom",
    file: null,
    reqId: null,
  });
});

test("finding() accepts file and reqId", () => {
  const f = finding("c", SEVERITY.WARN, "msg", { file: "skills/x/SKILL.md", reqId: "U5" });
  assert.equal(f.severity, "warn");
  assert.equal(f.file, "skills/x/SKILL.md");
  assert.equal(f.reqId, "U5");
});

test("finding() rejects an unknown severity", () => {
  assert.throws(() => finding("c", "fatal", "msg"), /severity/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/findings.test.mjs`
Expected: FAIL - cannot find module `findings.mjs`.

- [ ] **Step 3: Write the implementation**

`scripts/lib/findings.mjs`:
```js
export const SEVERITY = Object.freeze({ ERROR: "error", WARN: "warn" });

/**
 * Build a normalized Finding.
 * @returns {{check:string,severity:"error"|"warn",message:string,file:string|null,reqId:string|null}}
 */
export function finding(check, severity, message, opts = {}) {
  if (severity !== SEVERITY.ERROR && severity !== SEVERITY.WARN) {
    throw new Error(`invalid severity: ${severity}`);
  }
  return {
    check,
    severity,
    message,
    file: opts.file ?? null,
    reqId: opts.reqId ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/findings.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/findings.mjs tests/unit/findings.test.mjs
git commit -m "feat(checks): add Finding model with severity validation"
```

---

## Task 3: `lib/fs-utils.mjs` - filesystem helpers

**Files:**
- Create: `scripts/lib/fs-utils.mjs`
- Test: `tests/unit/fs-utils.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/fs-utils.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readJsonSafe, fileExists, listSkillDirs } from "../../scripts/lib/fs-utils.mjs";

function tmpRepo() {
  return mkdtempSync(path.join(tmpdir(), "ast-"));
}

test("readJsonSafe returns parsed data on valid JSON", () => {
  const dir = tmpRepo();
  const p = path.join(dir, "library.json");
  writeFileSync(p, JSON.stringify({ name: "x" }));
  assert.deepEqual(readJsonSafe(p), { data: { name: "x" }, parseError: null });
});

test("readJsonSafe returns parseError on bad JSON", () => {
  const dir = tmpRepo();
  const p = path.join(dir, "library.json");
  writeFileSync(p, "{ not json");
  const r = readJsonSafe(p);
  assert.equal(r.data, null);
  assert.match(r.parseError, /.+/);
});

test("readJsonSafe returns null data when file is missing", () => {
  const r = readJsonSafe(path.join(tmpRepo(), "nope.json"));
  assert.equal(r.data, null);
  assert.equal(r.parseError, null);
});

test("fileExists detects files", () => {
  const dir = tmpRepo();
  writeFileSync(path.join(dir, "AGENTS.md"), "hi");
  assert.equal(fileExists(path.join(dir, "AGENTS.md")), true);
  assert.equal(fileExists(path.join(dir, "MISSING.md")), false);
});

test("listSkillDirs returns dirs under skills/ that contain SKILL.md", () => {
  const dir = tmpRepo();
  mkdirSync(path.join(dir, "skills", "alpha"), { recursive: true });
  writeFileSync(path.join(dir, "skills", "alpha", "SKILL.md"), "x");
  mkdirSync(path.join(dir, "skills", "not-a-skill"), { recursive: true });
  const found = listSkillDirs(dir).map((d) => path.basename(d));
  assert.deepEqual(found, ["alpha"]);
});

test("listSkillDirs returns [] when skills/ is absent", () => {
  assert.deepEqual(listSkillDirs(tmpRepo()), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/fs-utils.test.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Write the implementation**

`scripts/lib/fs-utils.mjs`:
```js
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

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
  if (!existsSync(skillsRoot)) return [];
  return readdirSync(skillsRoot)
    .map((name) => path.join(skillsRoot, name))
    .filter((dir) => statSync(dir).isDirectory() && fileExists(path.join(dir, "SKILL.md")));
}

/** Recursively list file paths under dir (absolute). [] if dir missing. */
export function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/fs-utils.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/fs-utils.mjs tests/unit/fs-utils.test.mjs
git commit -m "feat(checks): add fs helpers (readJsonSafe, listSkillDirs, walkFiles)"
```

---

## Task 4: `lib/frontmatter.mjs` - parse SKILL.md frontmatter

**Files:**
- Create: `scripts/lib/frontmatter.mjs`
- Test: `tests/unit/frontmatter.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/frontmatter.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter } from "../../scripts/lib/frontmatter.mjs";

const sample = `---
name: my-skill
description: Does a thing and says when to use it.
---
# Body
hello`;

test("parses frontmatter and body", () => {
  const r = parseFrontmatter(sample);
  assert.equal(r.parseError, null);
  assert.equal(r.frontmatter.name, "my-skill");
  assert.match(r.body, /# Body/);
});

test("missing frontmatter fence is a parseError", () => {
  const r = parseFrontmatter("# no frontmatter here");
  assert.equal(r.frontmatter, null);
  assert.match(r.parseError, /frontmatter/i);
});

test("invalid YAML is a parseError", () => {
  const r = parseFrontmatter(`---\nname: [unclosed\n---\nbody`);
  assert.equal(r.frontmatter, null);
  assert.match(r.parseError, /.+/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/frontmatter.test.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Write the implementation**

`scripts/lib/frontmatter.mjs`:
```js
import { parse as parseYaml } from "yaml";

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * @param {string} text full SKILL.md contents
 * @returns {{frontmatter: object|null, body: string, parseError: string|null}}
 */
export function parseFrontmatter(text) {
  const m = text.match(FENCE);
  if (!m) {
    return { frontmatter: null, body: text, parseError: "missing YAML frontmatter (--- fenced block at top)" };
  }
  try {
    const data = parseYaml(m[1]);
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      return { frontmatter: null, body: m[2], parseError: "frontmatter is not a key/value map" };
    }
    return { frontmatter: data, body: m[2], parseError: null };
  } catch (e) {
    return { frontmatter: null, body: m[2], parseError: e.message };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/frontmatter.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/frontmatter.mjs tests/unit/frontmatter.test.mjs
git commit -m "feat(checks): add frontmatter parser (yaml-backed, fail-safe)"
```

---

## Task 5: Test fixtures - golden + anti plugins

**Files:**
- Create: `tests/fixtures/golden/minimal-skill/library.json`
- Create: `tests/fixtures/golden/minimal-skill/AGENTS.md`
- Create: `tests/fixtures/golden/minimal-skill/skills/do-thing/SKILL.md`
- Create: `tests/fixtures/anti/bad-frontmatter/skills/broken/SKILL.md` (+ library.json, AGENTS.md)
- Create: `tests/fixtures/anti/name-mismatch/skills/wrong-name/SKILL.md` (+ library.json, AGENTS.md)
- Create: `tests/fixtures/anti/weak-description/skills/vague/SKILL.md` (+ library.json, AGENTS.md)
- Create: `tests/fixtures/anti/missing-library-json/AGENTS.md`

- [ ] **Step 1: Create the golden plugin.** It must pass every Bronze check.

`tests/fixtures/golden/minimal-skill/library.json`:
```json
{ "name": "minimal-skill", "version": "0.1.0", "description": "A minimal conformant fixture plugin used to prove the Universal checks pass. Use it as the golden baseline in the validation suite.", "standard": "0.7", "tier": "universal" }
```

`tests/fixtures/golden/minimal-skill/AGENTS.md`:
```markdown
# AGENTS.md
Golden fixture. See [INDEX](INDEX.md) is not required at Bronze.
```

`tests/fixtures/golden/minimal-skill/skills/do-thing/SKILL.md`:
```markdown
---
name: do-thing
description: Converts a CSV file into a formatted summary table. Use when the user asks to summarize, tabulate, or report on CSV or spreadsheet data.
metadata:
  version: 0.1.0
---
# do-thing
Steps the agent follows.
```

- [ ] **Step 2: Create the anti plugins.** Each isolates one failure.

`tests/fixtures/anti/bad-frontmatter/skills/broken/SKILL.md`:
```markdown
---
name: broken
description: [unclosed list
---
# broken
```

`tests/fixtures/anti/name-mismatch/skills/wrong-name/SKILL.md`:
```markdown
---
name: totally-different
description: Renders a Markdown document to PDF. Use when the user asks to export or convert notes to PDF.
---
# wrong-name
```

`tests/fixtures/anti/weak-description/skills/vague/SKILL.md`:
```markdown
---
name: vague
description: Helps with stuff.
---
# vague
```

`tests/fixtures/anti/missing-library-json/AGENTS.md`:
```markdown
# AGENTS.md
This plugin has no library.json, so it is loose components, not a plugin.
```

For `name-mismatch`, `weak-description`, and `bad-frontmatter`, also add a valid `library.json` (copy the golden one, change `name` to match the fixture dir) and a one-line `AGENTS.md`, so only the intended check fails.

- [ ] **Step 3: Commit**

```bash
git add tests/fixtures
git commit -m "test(fixtures): add golden + anti plugins for the Bronze checks"
```

---

## Task 6: `lib/load-plugin.mjs` - build the shared PluginContext

**Files:**
- Create: `scripts/lib/load-plugin.mjs`
- Test: `tests/unit/load-plugin.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/load-plugin.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";

const golden = path.resolve("tests/fixtures/golden/minimal-skill");
const missing = path.resolve("tests/fixtures/anti/missing-library-json");

test("loads library.json, AGENTS.md, and skills", () => {
  const ctx = loadPlugin(golden);
  assert.equal(ctx.library.data.name, "minimal-skill");
  assert.ok(ctx.agentsMdPath.endsWith("AGENTS.md"));
  assert.equal(ctx.skills.length, 1);
  assert.equal(ctx.skills[0].name, "do-thing");
  assert.equal(ctx.skills[0].frontmatter.name, "do-thing");
  assert.equal(ctx.skills[0].parseError, null);
});

test("missing library.json yields null data, not a throw", () => {
  const ctx = loadPlugin(missing);
  assert.equal(ctx.library.data, null);
  assert.equal(ctx.skills.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/load-plugin.test.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Write the implementation**

`scripts/lib/load-plugin.mjs`:
```js
import { readFileSync } from "node:fs";
import path from "node:path";
import { readJsonSafe, fileExists, listSkillDirs } from "./fs-utils.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";

/** @returns {import("./types").PluginContext} */
export function loadPlugin(root) {
  const libPath = path.join(root, "library.json");
  const library = { path: libPath, ...readJsonSafe(libPath) };

  const agentsMd = path.join(root, "AGENTS.md");
  const agentsMdPath = fileExists(agentsMd) ? agentsMd : null;

  const skills = listSkillDirs(root).map((dir) => {
    const skillMdPath = path.join(dir, "SKILL.md");
    const raw = readFileSync(skillMdPath, "utf8");
    const { frontmatter, body, parseError } = parseFrontmatter(raw);
    return { name: path.basename(dir), dir, skillMdPath, raw, frontmatter, body, parseError };
  });

  return { root, library, agentsMdPath, skills };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/load-plugin.test.mjs`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/load-plugin.mjs tests/unit/load-plugin.test.mjs
git commit -m "feat(checks): add loadPlugin to build the shared PluginContext"
```

---

## Task 7: Check U1 - `library.json` schema (`checks/library-json.mjs`)

**Files:**
- Create: `scripts/checks/library-json.mjs`
- Test: `tests/unit/library-json.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/library-json.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/library-json.mjs";

const golden = path.resolve("tests/fixtures/golden/minimal-skill");
const missing = path.resolve("tests/fixtures/anti/missing-library-json");

test("meta declares U1 at universal tier", () => {
  assert.equal(meta.reqId, "U1");
  assert.equal(meta.tier, "universal");
});

test("golden library.json produces no errors", () => {
  const findings = check(loadPlugin(golden));
  assert.equal(findings.filter((f) => f.severity === "error").length, 0);
});

test("missing library.json is an error citing the file", () => {
  const findings = check(loadPlugin(missing));
  const err = findings.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "U1");
  assert.match(err.message, /library\.json/);
});

test("missing required field (tier) is an error", () => {
  const ctx = { root: ".", library: { path: "library.json", data: { name: "x", version: "0.1.0", description: "d".repeat(40), standard: "0.7" }, parseError: null }, agentsMdPath: null, skills: [] };
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.severity === "error" && /tier/.test(f.message)));
});

test("bad semver version is an error", () => {
  const ctx = { root: ".", library: { path: "library.json", data: { name: "x", version: "v1", description: "d".repeat(40), standard: "0.7", tier: "universal" }, parseError: null }, agentsMdPath: null, skills: [] };
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.severity === "error" && /version/.test(f.message)));
});

test("invalid tier enum is an error", () => {
  const ctx = { root: ".", library: { path: "library.json", data: { name: "x", version: "0.1.0", description: "d".repeat(40), standard: "0.7", tier: "platinum" }, parseError: null }, agentsMdPath: null, skills: [] };
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.severity === "error" && /tier/.test(f.message)));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/library-json.test.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Write the implementation**

`scripts/checks/library-json.mjs`:
```js
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "library-json", tier: "universal", reqId: "U1" };

const SEMVER = /^\d+\.\d+\.\d+(?:[-+].+)?$/;
const TIERS = ["universal", "convergent", "advanced"];
const REQUIRED = ["name", "version", "description", "standard", "tier"];

export function check(ctx) {
  const out = [];
  const rel = "library.json";
  if (ctx.library.parseError) {
    return [finding(meta.id, SEVERITY.ERROR, `library.json is not valid JSON: ${ctx.library.parseError}`, { file: rel, reqId: meta.reqId })];
  }
  const data = ctx.library.data;
  if (!data) {
    return [finding(meta.id, SEVERITY.ERROR, "library.json is missing; a plugin MUST carry one (Standard sec 5). Add name, version, description, standard, tier.", { file: rel, reqId: meta.reqId })];
  }
  for (const key of REQUIRED) {
    if (!(key in data)) out.push(finding(meta.id, SEVERITY.ERROR, `library.json is missing required field "${key}" (Standard sec 5.1).`, { file: rel, reqId: meta.reqId }));
  }
  if (typeof data.version === "string" && !SEMVER.test(data.version)) {
    out.push(finding(meta.id, SEVERITY.ERROR, `library.json "version" must be semver (got "${data.version}").`, { file: rel, reqId: meta.reqId }));
  }
  if ("tier" in data && !TIERS.includes(data.tier)) {
    out.push(finding(meta.id, SEVERITY.ERROR, `library.json "tier" must be one of ${TIERS.join(", ")} (got "${data.tier}").`, { file: rel, reqId: meta.reqId }));
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/library-json.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/library-json.mjs tests/unit/library-json.test.mjs
git commit -m "feat(checks): U1 library.json schema validator (sec 5.1)"
```

---

## Task 8: Check U2 + U8 - anatomy (`checks/anatomy.mjs`)

**Files:**
- Create: `scripts/checks/anatomy.mjs`
- Test: `tests/unit/anatomy.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/anatomy.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/anatomy.mjs";

const golden = path.resolve("tests/fixtures/golden/minimal-skill");
const missing = path.resolve("tests/fixtures/anti/missing-library-json");

test("golden has AGENTS.md - no U2 error", () => {
  const findings = check(loadPlugin(golden));
  assert.equal(findings.filter((f) => f.reqId === "U2" && f.severity === "error").length, 0);
});

test("missing AGENTS.md is a U2 error", () => {
  // missing-library-json fixture has AGENTS.md, so synthesize a ctx with none
  const ctx = { root: ".", library: { data: { name: "x" }, parseError: null }, agentsMdPath: null, skills: [] };
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.reqId === "U2" && f.severity === "error"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/anatomy.test.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Write the implementation**

`scripts/checks/anatomy.mjs`:
```js
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "anatomy", tier: "universal", reqId: "U2" };

export function check(ctx) {
  const out = [];
  if (!ctx.agentsMdPath) {
    out.push(finding(meta.id, SEVERITY.ERROR, "AGENTS.md is required at the repository root at every tier (Standard sec 3.10, 2.1).", { file: "AGENTS.md", reqId: "U2" }));
  }
  // U8: Bronze layout subset - skills must live under skills/ (informational warn if none).
  if (ctx.skills.length === 0) {
    out.push(finding(meta.id, SEVERITY.WARN, "No skills found under skills/. A Bronze plugin may be empty, but conformance is only meaningful once skills exist.", { file: "skills/", reqId: "U8" }));
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/anatomy.test.mjs`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/anatomy.mjs tests/unit/anatomy.test.mjs
git commit -m "feat(checks): U2/U8 anatomy - AGENTS.md presence + layout"
```

---

## Task 9: Check U3 - frontmatter validity (`checks/frontmatter-valid.mjs`)

**Files:**
- Create: `scripts/checks/frontmatter-valid.mjs`
- Test: `tests/unit/frontmatter-valid.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/frontmatter-valid.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/frontmatter-valid.mjs";

const golden = path.resolve("tests/fixtures/golden/minimal-skill");
const bad = path.resolve("tests/fixtures/anti/bad-frontmatter");

test("golden skill frontmatter is valid - no errors", () => {
  assert.equal(check(loadPlugin(golden)).filter((f) => f.severity === "error").length, 0);
});

test("bad frontmatter is a U3 error naming the file", () => {
  const findings = check(loadPlugin(bad));
  const err = findings.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "U3");
  assert.match(err.file, /SKILL\.md$/);
});

test("missing required key (description) is a U3 error", () => {
  const ctx = { skills: [{ name: "s", skillMdPath: "skills/s/SKILL.md", frontmatter: { name: "s" }, parseError: null }] };
  assert.ok(check(ctx).some((f) => f.reqId === "U3" && /description/.test(f.message)));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/frontmatter-valid.test.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Write the implementation**

`scripts/checks/frontmatter-valid.mjs`:
```js
import { finding, SEVERITY } from "../lib/findings.mjs";
import path from "node:path";

export const meta = { id: "frontmatter-valid", tier: "universal", reqId: "U3" };

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const file = relish(s.skillMdPath, ctx.root);
    if (s.parseError) {
      out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter does not parse: ${s.parseError}`, { file, reqId: "U3" }));
      continue;
    }
    const fm = s.frontmatter || {};
    if (typeof fm.name !== "string") out.push(finding(meta.id, SEVERITY.ERROR, "frontmatter is missing required string \"name\" (Standard sec 3.1).", { file, reqId: "U3" }));
    else if (fm.name.length > 64 || !NAME_RE.test(fm.name)) out.push(finding(meta.id, SEVERITY.ERROR, `"name" must be 1-64 chars, lowercase a-z/0-9/-, no leading/trailing/consecutive hyphen (got "${fm.name}").`, { file, reqId: "U3" }));
    if (typeof fm.description !== "string") out.push(finding(meta.id, SEVERITY.ERROR, "frontmatter is missing required string \"description\" (Standard sec 3.1).", { file, reqId: "U3" }));
    else if (fm.description.length < 1 || fm.description.length > 1024) out.push(finding(meta.id, SEVERITY.ERROR, `"description" must be 1-1024 chars (got ${fm.description.length}).`, { file, reqId: "U3" }));
  }
  return out;
}

function relish(abs, root) {
  return root ? path.relative(root, abs).split(path.sep).join("/") : abs;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/frontmatter-valid.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/frontmatter-valid.mjs tests/unit/frontmatter-valid.test.mjs
git commit -m "feat(checks): U3 skill frontmatter validity (sec 3.1)"
```

---

## Task 10: Check U4 - name matches dir (`checks/name-matches-dir.mjs`)

**Files:**
- Create: `scripts/checks/name-matches-dir.mjs`
- Test: `tests/unit/name-matches-dir.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/name-matches-dir.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/name-matches-dir.mjs";

const golden = path.resolve("tests/fixtures/golden/minimal-skill");
const mismatch = path.resolve("tests/fixtures/anti/name-mismatch");

test("golden name == dir - no error", () => {
  assert.equal(check(loadPlugin(golden)).filter((f) => f.severity === "error").length, 0);
});

test("name != dir is a U4 error", () => {
  const findings = check(loadPlugin(mismatch));
  const err = findings.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "U4");
  assert.match(err.message, /wrong-name/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/name-matches-dir.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

`scripts/checks/name-matches-dir.mjs`:
```js
import { finding, SEVERITY } from "../lib/findings.mjs";
import path from "node:path";

export const meta = { id: "name-matches-dir", tier: "universal", reqId: "U4" };

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    if (s.parseError || !s.frontmatter || typeof s.frontmatter.name !== "string") continue; // U3 owns that
    if (s.frontmatter.name !== s.name) {
      const file = path.relative(ctx.root, s.skillMdPath).split(path.sep).join("/");
      out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter name "${s.frontmatter.name}" must equal the directory name "${s.name}" (Standard sec 3.1).`, { file, reqId: "U4" }));
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/name-matches-dir.test.mjs`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/name-matches-dir.mjs tests/unit/name-matches-dir.test.mjs
git commit -m "feat(checks): U4 skill name equals directory (sec 3.1)"
```

---

## Task 11: Check U5 - description score (`checks/description-score.mjs`)

**Files:**
- Create: `scripts/checks/description-score.mjs`
- Test: `tests/unit/description-score.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/description-score.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, scoreDescription } from "../../scripts/checks/description-score.mjs";

const golden = path.resolve("tests/fixtures/golden/minimal-skill");
const weak = path.resolve("tests/fixtures/anti/weak-description");

test("a strong description scores >= 0.7", () => {
  const s = scoreDescription("Converts a CSV file into a formatted summary table. Use when the user asks to summarize or tabulate spreadsheet data.");
  assert.ok(s >= 0.7, `score was ${s}`);
});

test("a vague description scores < 0.7", () => {
  assert.ok(scoreDescription("Helps with stuff.") < 0.7);
});

test("golden produces no warn for description", () => {
  assert.equal(check(loadPlugin(golden)).filter((f) => f.reqId === "U5").length, 0);
});

test("weak description is a WARN (never error) with U5", () => {
  const findings = check(loadPlugin(weak));
  const w = findings.find((f) => f.reqId === "U5");
  assert.ok(w);
  assert.equal(w.severity, "warn");
  assert.equal(findings.filter((f) => f.severity === "error").length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/description-score.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

`scripts/checks/description-score.mjs`:
```js
import { finding, SEVERITY } from "../lib/findings.mjs";
import path from "node:path";

export const meta = { id: "description-score", tier: "universal", reqId: "U5" };
export const THRESHOLD = 0.7;

const ANTI = /\b(helps with|handles|deals with|manages stuff|various things)\b/i;
const WHEN = /\b(use when|use this when|when the user|when you need|for when)\b/i;
const ACTION = /\b(creates?|generates?|converts?|validates?|builds?|renders?|extracts?|summari[sz]es?|formats?|analy[sz]es?|produces?|writes?)\b/i;
const FIRST_PERSON = /\b(I |you should|you can|we )\b/;

/** Heuristic 0-1 score per Standard sec 8.1. */
export function scoreDescription(desc) {
  if (typeof desc !== "string" || desc.trim().length === 0) return 0;
  let score = 0;
  if (ACTION.test(desc)) score += 0.35;            // states what
  if (WHEN.test(desc)) score += 0.35;              // states when
  if (/[a-z]{4,}/i.test(desc) && desc.split(/\s+/).length >= 8) score += 0.2; // concrete keywords / length
  if (!FIRST_PERSON.test(desc)) score += 0.1;      // third person
  if (ANTI.test(desc)) score -= 0.4;               // anti-pattern penalty
  if (/[<>]/.test(desc) || /\b[A-Z]{4,}\b/.test(desc)) score -= 0.1;
  return Math.max(0, Math.min(1, score));
}

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const desc = s.frontmatter?.description;
    if (typeof desc !== "string") continue; // U3 owns presence
    const score = scoreDescription(desc);
    if (score < THRESHOLD) {
      const file = path.relative(ctx.root, s.skillMdPath).split(path.sep).join("/");
      out.push(finding(meta.id, SEVERITY.WARN, `description scores ${score.toFixed(2)} (< ${THRESHOLD}); state what it does AND when to use it, with concrete trigger keywords (Standard sec 8.1).`, { file, reqId: "U5" }));
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/description-score.test.mjs`
Expected: PASS, 4 tests. If the golden description scores < 0.7, tune the golden fixture text (not the threshold) until it passes, then re-run.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/description-score.mjs tests/unit/description-score.test.mjs
git commit -m "feat(checks): U5 description scoring (sec 8.1, 0.7 warn)"
```

---

## Task 12: Check U6 - reference links (`checks/reference-links.mjs`)

**Files:**
- Create: `scripts/checks/reference-links.mjs`
- Test: `tests/unit/reference-links.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/reference-links.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { check } from "../../scripts/checks/reference-links.mjs";

function skillCtx(body) {
  const root = mkdtempSync(path.join(tmpdir(), "rl-"));
  const dir = path.join(root, "skills", "s");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "SKILL.md"), "x");
  return { root, skills: [{ name: "s", dir, skillMdPath: path.join(dir, "SKILL.md"), body, frontmatter: { name: "s" }, parseError: null }] };
}

test("resolving relative link - no error", () => {
  const ctx = skillCtx("see [ref](references/a.md)");
  mkdirSync(path.join(ctx.skills[0].dir, "references"), { recursive: true });
  writeFileSync(path.join(ctx.skills[0].dir, "references", "a.md"), "hi");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("broken relative link is a U6 error", () => {
  const ctx = skillCtx("see [ref](references/missing.md)");
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.reqId === "U6" && f.severity === "error"));
});

test("http links are ignored", () => {
  const ctx = skillCtx("see [x](https://example.com)");
  assert.equal(check(ctx).length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/reference-links.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

`scripts/checks/reference-links.mjs`:
```js
import { finding, SEVERITY } from "../lib/findings.mjs";
import { fileExists } from "../lib/fs-utils.mjs";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

export const meta = { id: "reference-links", tier: "universal", reqId: "U6" };

const LINK = /\[[^\]]*\]\(([^)]+)\)/g;

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const rel = path.relative(ctx.root, s.skillMdPath).split(path.sep).join("/");
    let m;
    LINK.lastIndex = 0;
    while ((m = LINK.exec(s.body || ""))) {
      let target = m[1].trim();
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      target = target.split("#")[0];
      if (!target) continue;
      const resolved = path.resolve(s.dir, target);
      const ok = existsSync(resolved) && (statSync(resolved).isFile() || statSync(resolved).isDirectory());
      if (!ok) out.push(finding(meta.id, SEVERITY.ERROR, `reference link "${m[1]}" does not resolve.`, { file: rel, reqId: "U6" }));
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/reference-links.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/reference-links.mjs tests/unit/reference-links.test.mjs
git commit -m "feat(checks): U6 reference-link resolution (sec 3.1)"
```

---

## Task 13: Check U7 - instruction budget (`checks/instruction-budget.mjs`)

**Files:**
- Create: `scripts/checks/instruction-budget.mjs`
- Test: `tests/unit/instruction-budget.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/instruction-budget.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../../scripts/checks/instruction-budget.mjs";

function ctxWith(body) {
  return { root: ".", skills: [{ name: "s", skillMdPath: "skills/s/SKILL.md", body, frontmatter: { name: "s" }, parseError: null }] };
}

test("short skill - no warn", () => {
  assert.equal(check(ctxWith("# short\nsome steps")).length, 0);
});

test("over-long skill is a U7 WARN (never error)", () => {
  const big = "line\n".repeat(600); // > 500 lines
  const findings = check(ctxWith(big));
  const w = findings.find((f) => f.reqId === "U7");
  assert.ok(w);
  assert.equal(w.severity, "warn");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/instruction-budget.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

`scripts/checks/instruction-budget.mjs`:
```js
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "instruction-budget", tier: "universal", reqId: "U7" };
export const MAX_LINES = 500;

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const lines = (s.body || "").split(/\r?\n/).length;
    if (lines > MAX_LINES) {
      out.push(finding(meta.id, SEVERITY.WARN, `SKILL.md body is ${lines} lines (> ${MAX_LINES}); move deep content into references/ (Standard sec 1, 3.1).`, { file: s.skillMdPath, reqId: "U7" }));
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/instruction-budget.test.mjs`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/instruction-budget.mjs tests/unit/instruction-budget.test.mjs
git commit -m "feat(checks): U7 instruction-budget warning (sec 1, 3.1)"
```

---

## Task 14: `checks/agentskills.mjs` - the skills-ref seam

**Files:**
- Create: `scripts/checks/agentskills.mjs`
- Test: `tests/unit/agentskills.test.mjs`

This composes U3-U7 into the single "agentskills.io-equivalent" surface the Standard sec 6 names. It is the swap point if a real `skills-ref` is adopted later.

- [ ] **Step 1: Write the failing test**

`tests/unit/agentskills.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { checkAgentskills } from "../../scripts/checks/agentskills.mjs";

const golden = path.resolve("tests/fixtures/golden/minimal-skill");
const bad = path.resolve("tests/fixtures/anti/bad-frontmatter");

test("golden passes agentskills equivalence (no errors)", () => {
  assert.equal(checkAgentskills(loadPlugin(golden)).filter((f) => f.severity === "error").length, 0);
});

test("bad frontmatter surfaces via the composed surface", () => {
  assert.ok(checkAgentskills(loadPlugin(bad)).some((f) => f.severity === "error"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/agentskills.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

`scripts/checks/agentskills.mjs`:
```js
import { check as frontmatter } from "./frontmatter-valid.mjs";
import { check as nameDir } from "./name-matches-dir.mjs";
import { check as description } from "./description-score.mjs";
import { check as refs } from "./reference-links.mjs";
import { check as budget } from "./instruction-budget.mjs";

/**
 * The agentskills.io-equivalent validation surface (Standard sec 6).
 * Reimplemented (decision Q1.1); a real skills-ref can replace the body here
 * without changing callers.
 */
export function checkAgentskills(ctx) {
  return [...frontmatter(ctx), ...nameDir(ctx), ...description(ctx), ...refs(ctx), ...budget(ctx)];
}

export const meta = { id: "agentskills", tier: "universal", reqId: null };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/agentskills.test.mjs`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/agentskills.mjs tests/unit/agentskills.test.mjs
git commit -m "feat(checks): agentskills.io equivalence seam (sec 6, decision Q1.1)"
```

---

## Task 15: `lib/registry.mjs` + `scripts/tier-report.mjs`

**Files:**
- Create: `scripts/lib/registry.mjs`
- Create: `scripts/tier-report.mjs`
- Test: `tests/unit/tier-report.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/tier-report.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const golden = path.resolve("tests/fixtures/golden/minimal-skill");
const missing = path.resolve("tests/fixtures/anti/missing-library-json");

test("golden reports universal satisfied, empty blocked", () => {
  const r = computeTierReport(golden);
  assert.equal(r.tier, "universal");
  assert.deepEqual(r.satisfies, ["universal"]);
  assert.deepEqual(r.blocked.convergent ?? [], []);
});

test("missing library.json blocks universal (U1)", () => {
  const r = computeTierReport(missing);
  assert.equal(r.tier, "none");
  assert.ok(r.blocked.universal.some((s) => s.startsWith("U1")));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/tier-report.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write the implementations**

`scripts/lib/registry.mjs`:
```js
import * as libraryJson from "../checks/library-json.mjs";
import * as anatomy from "../checks/anatomy.mjs";
import * as frontmatterValid from "../checks/frontmatter-valid.mjs";
import * as nameMatchesDir from "../checks/name-matches-dir.mjs";
import * as descriptionScore from "../checks/description-score.mjs";
import * as referenceLinks from "../checks/reference-links.mjs";
import * as instructionBudget from "../checks/instruction-budget.mjs";

/** Ordered checks. Each exports { meta:{id,tier,reqId}, check(ctx)->Finding[] }. */
export const CHECKS = [
  libraryJson, anatomy, frontmatterValid, nameMatchesDir,
  descriptionScore, referenceLinks, instructionBudget,
];

export function runAllChecks(ctx) {
  return CHECKS.flatMap((m) => m.check(ctx));
}
```

`scripts/tier-report.mjs`:
```js
import { loadPlugin } from "./lib/load-plugin.mjs";
import { runAllChecks } from "./lib/registry.mjs";

const TIER_ORDER = ["universal", "convergent", "advanced"];

export function computeTierReport(root) {
  const findings = runAllChecks(loadPlugin(root));
  const errorsByTier = { universal: [], convergent: [], advanced: [] };
  for (const f of findings) {
    if (f.severity !== "error") continue;
    const tier = tierForReq(f.reqId);
    errorsByTier[tier].push(`${f.reqId ?? "?"}: ${f.message}`);
  }
  const satisfies = [];
  for (const tier of TIER_ORDER) {
    if (errorsByTier[tier].length === 0 && satisfies.length === TIER_ORDER.indexOf(tier)) satisfies.push(tier);
    else break;
  }
  const tier = satisfies.length ? satisfies[satisfies.length - 1] : "none";
  const blocked = {};
  const next = TIER_ORDER[satisfies.length];
  if (next) blocked[next] = errorsByTier[next];
  return { tier, satisfies, blocked };
}

function tierForReq(reqId) {
  if (!reqId) return "universal";
  if (reqId.startsWith("U")) return "universal";
  if (reqId.startsWith("S")) return "convergent";
  return "advanced";
}

function human(r) {
  const next = Object.keys(r.blocked)[0];
  const blockers = next ? r.blocked[next] : [];
  if (!next || blockers.length === 0) return `Tier: ${cap(r.tier)} (no blockers detected)`;
  return `Tier: ${cap(r.tier)} (${cap(next)} blocked: ${blockers.length} issue${blockers.length === 1 ? "" : "s"})`;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// CLI entry
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("tier-report.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const r = computeTierReport(root);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else console.log(human(r));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/tier-report.test.mjs`
Expected: PASS, 2 tests. Then sanity-check the CLI: `node scripts/tier-report.mjs tests/fixtures/golden/minimal-skill` prints `Tier: Universal (no blockers detected)`.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/registry.mjs scripts/tier-report.mjs tests/unit/tier-report.test.mjs
git commit -m "feat(report): tier-report with blocked list keyed to requirement IDs (sec 2.4)"
```

---

## Task 16: `scripts/check.mjs` - the aggregate gate runner

**Files:**
- Create: `scripts/check.mjs`
- Test: `tests/unit/check-runner.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/check-runner.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { runGate } from "../../scripts/check.mjs";

const golden = path.resolve("tests/fixtures/golden/minimal-skill");
const missing = path.resolve("tests/fixtures/anti/missing-library-json");

test("golden gate passes (exitCode 0, no errors)", () => {
  const r = runGate(golden);
  assert.equal(r.exitCode, 0);
  assert.equal(r.errorCount, 0);
});

test("missing library.json fails the gate (exitCode 1)", () => {
  const r = runGate(missing);
  assert.equal(r.exitCode, 1);
  assert.ok(r.errorCount >= 1);
});

test("warnings alone do not fail the gate", () => {
  const r = runGate(path.resolve("tests/fixtures/anti/weak-description"));
  assert.equal(r.exitCode, 0);
  assert.ok(r.warnCount >= 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/check-runner.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

`scripts/check.mjs`:
```js
import { loadPlugin } from "./lib/load-plugin.mjs";
import { runAllChecks } from "./lib/registry.mjs";
import { computeTierReport } from "./tier-report.mjs";

export function runGate(root) {
  const findings = runAllChecks(loadPlugin(root));
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.filter((f) => f.severity === "warn").length;
  return { findings, errorCount, warnCount, exitCode: errorCount > 0 ? 1 : 0 };
}

function format(findings) {
  return findings
    .map((f) => `  [${f.severity}] ${f.check}${f.reqId ? " (" + f.reqId + ")" : ""}: ${f.message}${f.file ? "  -> " + f.file : ""}`)
    .join("\n");
}

if (process.argv[1]?.endsWith("check.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const r = runGate(root);
  if (r.findings.length) console.log(format(r.findings));
  console.log(`\n${human(root)}`);
  console.log(`\n${r.errorCount} error(s), ${r.warnCount} warning(s).`);
  process.exit(r.exitCode);
}

function human(root) {
  const t = computeTierReport(root);
  const next = Object.keys(t.blocked)[0];
  const n = next ? t.blocked[next].length : 0;
  return next && n ? `Tier: ${t.tier} (${next} blocked: ${n})` : `Tier: ${t.tier} (no blockers detected)`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/check-runner.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/check.mjs tests/unit/check-runner.test.mjs
git commit -m "feat(gate): aggregate runner - fail on error, surface warn (sec 4.5)"
```

---

## Task 17: Generators - `gen-index`, `gen-manifest`, `sync-agents-md`

**Files:**
- Create: `scripts/generators/gen-index.mjs`
- Create: `scripts/generators/gen-manifest.mjs`
- Create: `scripts/generators/sync-agents-md.mjs`
- Test: `tests/unit/gen-index.test.mjs`, `tests/unit/gen-manifest.test.mjs`

These are needed in full from Silver, but the renderers + drift basis are built now (release plan Phase 1). Each exports a pure `render(ctx) -> string` plus a `--write` CLI mode, so the drift check (later) compares `render(ctx)` to the file on disk.

- [ ] **Step 1: Write the failing test for gen-manifest**

`tests/unit/gen-manifest.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { renderManifest } from "../../scripts/generators/gen-manifest.mjs";

test("renderManifest projects library.json + skills into a resolved index", () => {
  const ctx = loadPlugin(path.resolve("tests/fixtures/golden/minimal-skill"));
  const m = JSON.parse(renderManifest(ctx));
  assert.equal(m.name, "minimal-skill");
  assert.equal(m.tier, "universal");
  assert.ok(Array.isArray(m.skills));
  assert.equal(m.skills[0].name, "do-thing");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/gen-manifest.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write gen-manifest**

`scripts/generators/gen-manifest.mjs`:
```js
import { loadPlugin } from "../lib/load-plugin.mjs";
import { writeFileSync } from "node:fs";
import path from "node:path";

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
  };
  return JSON.stringify(obj, null, 2) + "\n";
}

if (process.argv[1]?.endsWith("gen-manifest.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const ctx = loadPlugin(root);
  const text = renderManifest(ctx);
  if (process.argv.includes("--write")) writeFileSync(path.join(root, "manifest.generated.json"), text);
  else process.stdout.write(text);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/gen-manifest.test.mjs`
Expected: PASS, 1 test.

- [ ] **Step 5: Write gen-index test + implementation**

`tests/unit/gen-index.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { renderIndex } from "../../scripts/generators/gen-index.mjs";

test("renderIndex lists each skill with its description", () => {
  const md = renderIndex(loadPlugin(path.resolve("tests/fixtures/golden/minimal-skill")));
  assert.match(md, /do-thing/);
  assert.match(md, /summary table/);
});
```

`scripts/generators/gen-index.mjs`:
```js
import { loadPlugin } from "../lib/load-plugin.mjs";
import { writeFileSync } from "node:fs";
import path from "node:path";

export function renderIndex(ctx) {
  const lines = [`# INDEX - ${ctx.library.data?.name ?? "plugin"}`, "", "## Skills", ""];
  if (ctx.skills.length === 0) lines.push("- none yet");
  for (const s of ctx.skills) lines.push(`- **${s.name}** - ${s.frontmatter?.description ?? ""}`);
  return lines.join("\n") + "\n";
}

if (process.argv[1]?.endsWith("gen-index.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const ctx = loadPlugin(root);
  const text = renderIndex(ctx);
  if (process.argv.includes("--write")) writeFileSync(path.join(root, "INDEX.md"), text);
  else process.stdout.write(text);
}
```

Run: `node --test tests/unit/gen-index.test.mjs` -> PASS.

- [ ] **Step 6: Write sync-agents-md (stub renderer, full wiring is Silver)**

`scripts/generators/sync-agents-md.mjs`:
```js
import { loadPlugin } from "../lib/load-plugin.mjs";

/** Returns the generated component-list block AGENTS.md should contain. Wiring into AGENTS.md is Silver. */
export function renderAgentsComponentBlock(ctx) {
  const items = ctx.skills.length
    ? ctx.skills.map((s) => `- ${s.name}`).join("\n")
    : "- (no skills yet)";
  return `<!-- generated:components -->\n${items}\n<!-- /generated:components -->\n`;
}

if (process.argv[1]?.endsWith("sync-agents-md.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  process.stdout.write(renderAgentsComponentBlock(loadPlugin(root)));
}
```

- [ ] **Step 7: Commit**

```bash
git add scripts/generators tests/unit/gen-manifest.test.mjs tests/unit/gen-index.test.mjs
git commit -m "feat(gen): gen-manifest, gen-index, sync-agents-md renderers (sec 10.3)"
```

---

## Task 18: `checks/manifest-drift.mjs` - native manifest vs library.json

**Files:**
- Create: `scripts/checks/manifest-drift.mjs`
- Test: `tests/unit/manifest-drift.test.mjs`

At Bronze this is a `warn` (generated INDEX/manifest are a Gold requirement, G4); it guards the hand-synced seed.

- [ ] **Step 1: Write the failing test**

`tests/unit/manifest-drift.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../../scripts/checks/manifest-drift.mjs";

test("matching name/version - no finding", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, claudeManifest: { name: "x", version: "0.1.0" } };
  assert.equal(check(ctx).length, 0);
});

test("version drift between library.json and plugin.json is a WARN", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.2.0" } }, claudeManifest: { name: "x", version: "0.1.0" } };
  const f = check(ctx)[0];
  assert.equal(f.severity, "warn");
  assert.match(f.message, /version/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/manifest-drift.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write the implementation** (and extend `loadPlugin` to read the Claude manifest)

Add to `scripts/lib/load-plugin.mjs` inside `loadPlugin`, before `return`:
```js
  const claude = readJsonSafe(path.join(root, ".claude-plugin", "plugin.json"));
```
and add `claudeManifest: claude.data` to the returned object.

`scripts/checks/manifest-drift.mjs`:
```js
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "manifest-drift", tier: "universal", reqId: "U8" };

export function check(ctx) {
  const lib = ctx.library?.data;
  const cm = ctx.claudeManifest;
  if (!lib || !cm) return [];
  const out = [];
  for (const k of ["name", "version"]) {
    if (lib[k] !== cm[k]) {
      out.push(finding(meta.id, SEVERITY.WARN, `.claude-plugin/plugin.json ${k} "${cm[k]}" differs from library.json "${lib[k]}"; native manifests are generated from library.json at Gold (sec 5, G4).`, { file: ".claude-plugin/plugin.json", reqId: "U8" }));
    }
  }
  return out;
}
```

- [ ] **Step 4: Add to registry + run all tests**

Add `import * as manifestDrift from "../checks/manifest-drift.mjs";` to `scripts/lib/registry.mjs` and include `manifestDrift` in `CHECKS`. Then:
Run: `npm test`
Expected: all suites PASS (including `load-plugin.test.mjs` still green with the new field).

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/manifest-drift.mjs scripts/lib/load-plugin.mjs scripts/lib/registry.mjs tests/unit/manifest-drift.test.mjs
git commit -m "feat(checks): manifest drift warn between native manifest and library.json"
```

---

## Task 19: Wire CI to the gate (replace the Phase 0 stub)

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace the placeholder step**

In `.github/workflows/ci.yml`, replace the "Conformance checks (placeholder until Phase 1)" step with:
```yaml
      - name: Install dependencies
        run: npm ci

      - name: Unit tests
        run: npm test

      - name: Conformance gate (self-validation)
        run: node scripts/check.mjs
```

- [ ] **Step 2: Verify parity locally** (the same commands CI runs)

Run: `npm ci && npm test && node scripts/check.mjs`
Expected: tests PASS; gate prints `Tier: universal (no blockers detected)` for the repo and exits 0. (See Task 20 - the repo seed must pass first.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run unit tests + conformance gate via scripts (sec 4.4 parity)"
```

---

## Task 20: Self-validation - the repo seed passes Bronze (exit gate)

**Files:**
- Test: `tests/unit/seed-bronze.test.mjs`

- [ ] **Step 1: Write the self-validation test**

`tests/unit/seed-bronze.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { runGate } from "../../scripts/check.mjs";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const REPO = process.cwd();

test("the repository seed passes the Bronze gate", () => {
  const r = runGate(REPO);
  assert.equal(r.errorCount, 0, JSON.stringify(r.findings.filter((f) => f.severity === "error"), null, 2));
  assert.equal(r.exitCode, 0);
});

test("the repository reports tier universal with empty blocked", () => {
  const t = computeTierReport(REPO);
  assert.equal(t.tier, "universal");
  assert.deepEqual(t.blocked.convergent ?? [], []);
});
```

- [ ] **Step 2: Run it**

Run: `node --test tests/unit/seed-bronze.test.mjs`
Expected: PASS. If it fails, the finding messages name the offending file - fix the seed (not the test) until green. This is R1 being retired automatically: the hand-reviewed seed is now machine-verified.

- [ ] **Step 3: Run the full suite + the gate**

Run: `npm test && node scripts/check.mjs`
Expected: every suite PASS; gate exits 0 and prints `Tier: universal (no blockers detected)`.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/seed-bronze.test.mjs
git commit -m "test: self-validate the repo seed at Bronze (Phase 1 exit gate, retires R1)"
```

- [ ] **Step 5: Bump declared validation + changelog, then push**

Update `CHANGELOG.md` `[Unreleased]` with the Phase 1 additions (the script suite, generators, tier-report, CI). Then:
```bash
git add CHANGELOG.md
git commit -m "docs: changelog for Phase 1 validation spine"
git push origin main
```

Expected: CI runs `npm ci && npm test && node scripts/check.mjs` and is green.

---

## Self-Review (run before handing off)

**1. Spec coverage** (release plan Phase 1 "Ships"):
- Checks: frontmatter (T9), name==dir (T10), description-scoring 0.7 (T11), reference-link (T12), instruction-budget (T13), agentskills.io compliance (T14), library.json schema (T7), anatomy/structure (T8), manifest-vs-disk drift (T18). COVERED.
- Generators: gen-index (T17), gen-manifest (T17), sync-agents-md (T17). COVERED.
- tier-report machine + human, blocked keyed to req IDs (T15). COVERED.
- Aggregate gate (error fails, warn surfaces) + ci.yml shells out to scripts (T16, T19). COVERED.
- Test corpus golden/anti (T5). COVERED.
- Exit gate: scripts unit-tested (all tasks), anti fail / golden pass (T5-T16), seed passes Bronze (T20), local/CI parity (T19), tier-report prints Bronze (T20). COVERED.

**2. Placeholder scan:** every code step contains complete code; no TBD/TODO. The only deliberately-deferred-to-Silver pieces (sync-agents-md AGENTS.md write-back; native Codex manifest generation) are named as such, not left as gaps in Phase 1's scope.

**3. Type consistency:** `Finding` shape, `finding()` signature, `meta = {id,tier,reqId}` export, and `check(ctx)->Finding[]` are uniform across Tasks 2-18. `loadPlugin` returns `{root, library, agentsMdPath, skills, claudeManifest}` (claudeManifest added in T18, consumed only there). `runAllChecks`/`runGate`/`computeTierReport` names are consistent across T15, T16, T20.

## Open carry-forwards into Phase 2

- Q3.x Codex round-trip spike (R2) - not Phase 1.
- `description-score` heuristic weights will need tuning against a larger corpus as real skills land; threshold stays 0.7, only the fixture/weights move.
- If Task 0's spike finds a real `skills-ref` with JSON output, add a follow-up task to wrap it behind `checkAgentskills` (the seam already exists).
