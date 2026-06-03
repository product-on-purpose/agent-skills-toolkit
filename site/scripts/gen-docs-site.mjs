// gen-docs-site.mjs - generate the Pattern S docs site from the public docs/ tree.
//
// WHAT IT IS: the site generator for ADR 0024 D2's "generated Pattern S view". The Astro
//   Starlight site presents the repository's public documentation (the Diataxis docs/ tree) with a
//   curated landing on top; this script produces the per-page content the stock docsLoader() reads.
// WHAT IT DOES: mirrors every public quadrant of repo-root docs/ (every subdir except docs/internal/)
//   into site/src/content/docs/<quadrant>/, rewriting intra-repo links so the rendered site has zero
//   browser-broken internal links: a link to another published doc becomes a base-absolute site
//   route; a link to anything else (STANDARD.md, skills/**, scripts/**, library.json, docs/internal)
//   becomes an absolute GitHub blob URL (which the link guard skips). Frontmatter and fenced code are
//   passed through verbatim. The generated quadrants are wiped and rewritten on every run.
// WHY IT MATTERS: the public docs are authored once and rendered two ways - relative links work for
//   GitHub repo browsing, the rewritten copies work on the web. Generated (never committed) output
//   means no drift surface: the site can never disagree with docs/ because it is rebuilt from it.
// WHAT USES IT: site/package.json `dev` and `build` run it before astro; check-generated-untracked.mjs
//   asserts its output stays gitignored; ci.yml / deploy-pages.yml build the site it produces.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(SCRIPT_DIR, '..'); // site/
const REPO = path.resolve(SITE, '..'); // repo root
const SRC_DOCS = path.join(REPO, 'docs'); // the repo's own docs tree (public + internal)
const OUT = path.join(SITE, 'src', 'content', 'docs'); // Starlight content collection

// Mirrors astro.config.mjs `base` (the single source of clause 14.7) so generated routes are
// base-absolute and resolve in the browser. The blob base routes off-site links to the GitHub source
// (the documented "fix broken links by routing to a GitHub source URL" path in check-rendered-links).
const BASE = '/agent-skills-toolkit';
const GH_BLOB = 'https://github.com/product-on-purpose/agent-skills-toolkit/blob/main';

// docs/internal/ is the governance/public split: it is the repository's own internal tree and is
// never built into the site (ADR 0024 D2, R-SITE-3). Every other subdir of docs/ is a public quadrant.
const EXCLUDE_TOP = new Set(['internal']);

const SKIP_SCHEME = /^(https?:|mailto:|tel:|ftp:|ws:|wss:|data:|javascript:|#|\/\/)/i;

/** The public quadrants emitted to the site: every subdir of docs/ except internal. */
export function emittedDirs() {
  if (!fs.existsSync(SRC_DOCS)) return [];
  return fs
    .readdirSync(SRC_DOCS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !EXCLUDE_TOP.has(e.name))
    .map((e) => e.name)
    .sort();
}

function walkMd(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(full, acc);
    else if (e.name.endsWith('.md') || e.name.endsWith('.mdx')) acc.push(full);
  }
  return acc;
}

function isPublicDocMd(repoRelPosix) {
  return (
    repoRelPosix.startsWith('docs/') &&
    !repoRelPosix.startsWith('docs/internal/') &&
    (repoRelPosix.endsWith('.md') || repoRelPosix.endsWith('.mdx'))
  );
}

/** Rewrite one link target relative to its source file into a site-safe destination. */
export function rewriteTarget(target, srcFileAbs) {
  if (!target || SKIP_SCHEME.test(target)) return target;
  const hashIdx = target.indexOf('#');
  const anchor = hashIdx >= 0 ? target.slice(hashIdx) : '';
  let pathPart = hashIdx >= 0 ? target.slice(0, hashIdx) : target;
  const qIdx = pathPart.indexOf('?');
  const query = qIdx >= 0 ? pathPart.slice(qIdx) : '';
  if (qIdx >= 0) pathPart = pathPart.slice(0, qIdx);
  if (!pathPart) return target; // defensive: pure-anchor already skipped above

  const abs = path.resolve(path.dirname(srcFileAbs), pathPart);
  const repoRel = path.relative(REPO, abs).split(path.sep).join('/');

  if (isPublicDocMd(repoRel)) {
    // Another published page: base-absolute route, trailing slash (Starlight serves slug/index.html),
    // keep the #anchor. e.g. docs/reference/gold-checks.md -> /agent-skills-toolkit/reference/gold-checks/
    const slug = repoRel.slice('docs/'.length).replace(/\.mdx?$/, '');
    return `${BASE}/${slug}/${anchor}`;
  }
  // Anything outside the published tree (the Standard, a skill reference, a script, library.json, an
  // internal doc): route to the GitHub source. These are http(s) URLs, so the rendered-link guard
  // skips them (it only resolves intra-site links).
  return `${GH_BLOB}/${repoRel}${query}${anchor}`;
}

/** Rewrite links in a markdown body, leaving fenced code blocks untouched. */
function rewriteBodyLinks(body, srcFileAbs) {
  const lines = body.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    lines[i] = line
      // inline links and images: [text](target) / ![alt](target "title")
      .replace(/(\]\()([^)]+)(\))/g, (m, open, inner, close) => {
        const mm = inner.match(/^(\S+)(\s.*)?$/);
        if (!mm) return m;
        return open + rewriteTarget(mm[1], srcFileAbs) + (mm[2] || '') + close;
      })
      // reference-style definitions: [label]: target "title"?
      .replace(/^(\s*\[[^\]]+\]:\s+)(\S+)(.*)$/, (m, p, url, rest) => p + rewriteTarget(url, srcFileAbs) + rest);
  }
  return lines.join('\n');
}

/** Split leading YAML frontmatter (preserved verbatim) from the body (links rewritten). */
function transform(content, srcFileAbs) {
  if (content.startsWith('---\n') || content.startsWith('---\r\n')) {
    const end = content.indexOf('\n---', 4);
    if (end !== -1) {
      const afterIdx = content.indexOf('\n', end + 1);
      const head = content.slice(0, afterIdx === -1 ? content.length : afterIdx + 1);
      const body = afterIdx === -1 ? '' : content.slice(afterIdx + 1);
      return head + rewriteBodyLinks(body, srcFileAbs);
    }
  }
  return rewriteBodyLinks(content, srcFileAbs);
}

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function main() {
  if (!fs.existsSync(SRC_DOCS)) {
    console.error(`gen-docs-site: no docs/ tree at ${SRC_DOCS}; nothing to generate.`);
    process.exit(1);
  }
  const dirs = emittedDirs();
  let pages = 0;
  for (const dir of dirs) {
    const srcDir = path.join(SRC_DOCS, dir);
    const outDir = path.join(OUT, dir);
    rmrf(outDir); // wipe so a deleted source page never lingers as a stale route
    for (const file of walkMd(srcDir)) {
      const rel = path.relative(srcDir, file);
      const dest = path.join(outDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, transform(fs.readFileSync(file, 'utf8'), file), 'utf8');
      pages++;
    }
  }
  console.log(`gen-docs-site: emitted ${pages} page(s) across ${dirs.length} quadrant(s) [${dirs.join(', ')}] into src/content/docs/`);
}

// Run when invoked directly; stay importable (emittedDirs/rewriteTarget) for the untracked guard + tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
