// what-it-is:   README version drift guard
// what-it-does: reads library.json for the canonical version, then scans README.md for a
//               shields.io version badge and fails if they disagree
// why:          the README badge can silently lag behind a version bump; catching it early
//               keeps the public-facing version claim trustworthy
// used-by:      npm test (prepended to the node --test invocation in package.json)
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const dir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const libPath = path.join(dir, "library.json");
const readmePath = path.join(dir, "README.md");

// Validate files exist
if (!existsSync(libPath)) {
  process.stderr.write(`check-readme-version: library.json not found at ${libPath}\n`);
  process.exit(1);
}
if (!existsSync(readmePath)) {
  process.stderr.write(`check-readme-version: README.md not found at ${readmePath}\n`);
  process.exit(1);
}

// Read library.json version by key (not line position)
let libVersion;
try {
  const lib = JSON.parse(readFileSync(libPath, "utf8"));
  libVersion = lib.version;
} catch (e) {
  process.stderr.write(`check-readme-version: failed to parse library.json: ${e.message}\n`);
  process.exit(1);
}
if (!libVersion) {
  process.stderr.write(`check-readme-version: library.json has no version field\n`);
  process.exit(1);
}

// Read README.md and find the version badge by regex pattern (not line position)
const readme = readFileSync(readmePath, "utf8");
const BADGE_RE = /\/badge\/version-([\d]+\.[\d]+\.[\d]+)-/;
const m = readme.match(BADGE_RE);
if (!m) {
  process.stderr.write(`check-readme-version: no version badge found in README.md (expected pattern: /badge/version-X.Y.Z-)\n`);
  process.exit(1);
}

const badgeVersion = m[1];
if (badgeVersion !== libVersion) {
  process.stderr.write(
    `check-readme-version: version drift detected\n` +
    `  README badge : ${badgeVersion}\n` +
    `  library.json : ${libVersion}\n` +
    `  Update the README.md version badge to match library.json.\n`
  );
  process.exit(1);
}

process.stdout.write(`check-readme-version: OK (${libVersion})\n`);
