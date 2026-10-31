// what-it-is:   report.v1.json schema validation, ADR 0063 sec 5
// what-it-does: validates a REAL plugin report and a REAL component report (from evaluate()) against
//               schemas/report.v1.json, using a small hand-rolled validator (this project ships zero
//               test-framework / schema-library dependencies - package.json's own npm test comment)
// why:          ADR 0063 sec 5: "the report object becomes versioned and additive", with a JSON Schema
//               at schemas/report.v1.json covering the plugin/component shape scripts/evaluate.mjs emits
// used-by:      npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { evaluate } from "../../scripts/evaluate.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCHEMA = JSON.parse(readFileSync(path.join(REPO, "schemas/report.v1.json"), "utf8"));

/**
 * A small, deliberately partial JSON Schema (draft-07) validator - only the keywords
 * schemas/report.v1.json actually uses: type (string or array of strings, including "null"), const,
 * enum, required, properties, additionalProperties (ignored: true throughout this schema, so nothing
 * to enforce), items, oneOf, if/then/else (W6 finding 11: "advisoryLayer off implies advisoryFindings
 * and health are null"), and local $ref (resolved only against "#/definitions/<name>" in THIS
 * document). It is not a general-purpose validator and must never be imported outside this test file.
 * Returns an array of error strings; empty means valid.
 */
function validate(schema, data, path_ = "$") {
  const errors = [];
  const resolve = (s) => {
    if (s.$ref) {
      const name = s.$ref.replace("#/definitions/", "");
      const target = SCHEMA.definitions[name];
      if (!target) throw new Error(`unresolved $ref: ${s.$ref}`);
      return target;
    }
    return s;
  };
  schema = resolve(schema);

  if (schema.oneOf) {
    const results = schema.oneOf.map((s) => validate(s, data, path_));
    if (!results.some((r) => r.length === 0)) {
      errors.push(`${path_}: matched none of ${schema.oneOf.length} oneOf branches (first branch errors: ${results[0].join("; ")})`);
    }
    return errors;
  }

  if (schema.if) {
    const ifErrors = validate(schema.if, data, path_);
    if (ifErrors.length === 0 && schema.then) errors.push(...validate(schema.then, data, path_));
    else if (ifErrors.length > 0 && schema.else) errors.push(...validate(schema.else, data, path_));
  }
  if (schema.const !== undefined && data !== schema.const) {
    errors.push(`${path_}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(data)}`);
  }
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path_}: ${JSON.stringify(data)} is not one of ${JSON.stringify(schema.enum)}`);
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = data === null ? "null" : Array.isArray(data) ? "array" : typeof data === "number" ? (Number.isInteger(data) ? "integer" : "number") : typeof data;
    const ok = types.includes(actual) || (types.includes("number") && actual === "integer");
    if (!ok) errors.push(`${path_}: expected type ${types.join("|")}, got ${actual}`);
  }
  if (schema.properties && data && typeof data === "object" && !Array.isArray(data)) {
    for (const [key, subschema] of Object.entries(schema.properties)) {
      if (data[key] !== undefined) errors.push(...validate(subschema, data[key], `${path_}.${key}`));
    }
  }
  if (schema.required && data && typeof data === "object") {
    for (const key of schema.required) {
      if (!(key in data)) errors.push(`${path_}: missing required property "${key}"`);
    }
  }
  if (schema.items && Array.isArray(data)) {
    data.forEach((item, i) => errors.push(...validate(schema.items, item, `${path_}[${i}]`)));
  }
  return errors;
}

function assertValid(data, label) {
  const errors = validate(SCHEMA, data);
  assert.deepEqual(errors, [], `${label} failed report.v1.json validation:\n${errors.join("\n")}`);
}

test("schemas/report.v1.json itself parses and declares the documented shape", () => {
  assert.equal(SCHEMA.title, "agent-skills-toolkit evaluation report, schema version 1");
  assert.ok(SCHEMA.definitions.health, "the health definition must exist");
  assert.ok(SCHEMA.definitions.healthCategory, "the healthCategory definition must exist");
});

test("a REAL plugin report (potemkin-gold) validates against report.v1.json", () => {
  const r = evaluate(path.join(REPO, "tests/fixtures/audit-corpus/potemkin-gold"));
  assertValid(r, "potemkin-gold plugin report");
});

test("a REAL plugin report with --no-advisory (health: null) validates against report.v1.json", () => {
  const r = evaluate(path.join(REPO, "tests/fixtures/audit-corpus/potemkin-gold"), { noAdvisory: true });
  assertValid(r, "potemkin-gold plugin report (--no-advisory)");
});

test("a REAL component report (golden/lone-skill) validates against report.v1.json", () => {
  const r = evaluate(path.join(REPO, "tests/fixtures/golden/lone-skill"));
  assert.equal(r.scope, "component");
  assertValid(r, "lone-skill component report");
});

test("a REAL plugin report under --profile plain-plugin (off-by-profile categories) validates against report.v1.json", () => {
  const r = evaluate(path.join(REPO, "tests/fixtures/audit-corpus/potemkin-gold"), { profile: "plain-plugin" });
  assertValid(r, "potemkin-gold plugin report (plain-plugin profile)");
});

test("validation CAN fail: a report missing a required top-level field is rejected", () => {
  const r = evaluate(path.join(REPO, "tests/fixtures/golden/lone-skill"));
  const broken = { ...r };
  delete broken.health;
  const errors = validate(SCHEMA, broken);
  assert.ok(errors.length > 0, "a report missing `health` must fail validation - a guard that cannot fail is not a guard");
});

// W6 finding 11: the schema's if/then enforces "advisoryLayer off implies advisoryFindings and health
// are null". The positive case is already covered by "a REAL plugin report with --no-advisory" above
// (health/advisoryFindings really ARE both null there, and that report must still validate). This is
// the negative case a guard needs to be shown failing: a report that says the layer is off but still
// carries health data must be rejected.
test("validation CAN fail: advisoryLayer 'off' beside a non-null health is rejected", () => {
  const r = evaluate(path.join(REPO, "tests/fixtures/golden/lone-skill"));
  const broken = { ...r, advisoryLayer: "off", advisoryFindings: null }; // health stays whatever the real report had - non-null
  const errors = validate(SCHEMA, broken);
  assert.ok(errors.some((e) => e.includes("health")), `expected a health error, got:\n${errors.join("\n")}`);
});

test("validation CAN fail: an invalid checks[] outcome is rejected", () => {
  const r = evaluate(path.join(REPO, "tests/fixtures/golden/lone-skill"));
  const broken = { ...r, checks: [{ ...r.checks[0], outcome: "maybe" }] };
  const errors = validate(SCHEMA, broken);
  assert.ok(errors.some((e) => e.includes("outcome")), `expected an outcome error, got:\n${errors.join("\n")}`);
});
