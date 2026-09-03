#!/usr/bin/env node
// what-it-is:   the deploy-time family-registry generator (RS-D3, cut 2)
// what-it-does: fetches the catalogue, checks every member out at the sha the catalogue PINS, grades the
//               collection with the shipped evaluator, and writes the dated page the site serves
// why:          the registry was a hand-run, committed snapshot. It went twenty days stale carrying two
//               wrong claims - a toolkit six releases old, and three rows graded against drifted local
//               checkouts the catalogue does not pin, whose numbers nobody could reproduce. Regenerating
//               it by hand fixes today and guarantees the same staleness returns. Generated at deploy
//               time, the page's measurement date IS the deploy date and cannot drift from it.
// used-by:      .github/workflows/deploy-pages.yml; covered by tests/unit/gen-family-registry.test.mjs
//
// IT NEVER FAILS THE SITE BUILD. Every network failure is a PAGE STATE, not an exit state: an unreachable
// catalogue produces a dated "could not measure this deploy" page, and an unreachable member degrades one
// row because the marketplace scope already reports an absent member as not-graded rather than red
// (resolve.mjs's environment-gap split). Somebody else's outage is not a fact about this repository, and
// it must not be able to take the documentation site down. The ONLY exit-1 case is being unable to write
// the page at all, because a deploy that silently serves nothing is the staleness this exists to retire.
//
// IT DOES NOT CARRY THE PAGE'S REASONING, AND MUST NOT. docs/reference/family-registry.md holds what the
// columns mean, why the collection is red, what would turn it green, and the correction-to-the-record
// naming the episode where the page carried a false verdict. None of that is derivable from a run, and a
// generator that overwrote it would delete the record at the first deploy. This writes the MEASUREMENT
// and links the MEANING; RS-D3's fourth acceptance criterion is satisfied by the note living on the page
// this generator cannot reach.
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJsonSafe } from "./lib/fs-utils.mjs";
import { fetchAtSha, fetchMembers } from "./lib/fetch-members.mjs";
import { TIER_SCOPE_SENTENCE, LIMITATIONS_URL } from "./gen-site-reports.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

export const CATALOGUE_URL = "https://github.com/product-on-purpose/agent-plugins.git";
export const CATALOGUE_REF = "main";
export const MANIFEST_REL = ".claude-plugin/marketplace.json";

/** Where the narrative lives. The generated page links it; the generator never writes it. */
export const NARRATIVE_URL = "https://product-on-purpose.github.io/agent-skills-toolkit/reference/family-registry/";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const STYLE = `
  :root { color-scheme: light dark; --fg:#1a1a1a; --bg:#fdfdfc; --mut:#5a5a56; --line:#dedcd6; --accent:#6b4fa8; --warn:#8a6d1f; }
  @media (prefers-color-scheme: dark) { :root { --fg:#ecebe7; --bg:#16161a; --mut:#a3a29c; --line:#33333a; --accent:#b9a3e8; --warn:#d8bd6a; } }
  body { margin:0; padding:2.5rem 1.25rem; background:var(--bg); color:var(--fg);
         font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  main { max-width:60rem; margin:0 auto; }
  h1 { font-size:1.6rem; margin:0 0 .25rem; letter-spacing:-.01em; }
  .meta { color:var(--mut); font-size:.9rem; margin:0 0 1.5rem; }
  .scope { border-left:3px solid var(--accent); padding:.75rem 1rem; margin:0 0 1.5rem;
           background:color-mix(in srgb, var(--accent) 7%, transparent); font-size:.95rem; }
  .note { border-left:3px solid var(--warn); padding:.75rem 1rem; margin:0 0 1.5rem;
          background:color-mix(in srgb, var(--warn) 10%, transparent); font-size:.95rem; }
  a { color:var(--accent); }
  code { font:0.9em ui-monospace,SFMono-Regular,Menlo,monospace; }
  .wrap { overflow-x:auto; }
`;

function page({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head>
<body><main>
${body}
</main></body>
</html>
`;
}

/** The banner every generated page carries: what was measured, when, from which catalogue commit. */
export function renderBanner({ measuredAt, catalogueSha, failures }) {
  const notMeasured = failures.length === 0 ? "" : `<div class="note"><strong>${failures.length} member(s) could not be measured this deploy</strong>, and are reported not-graded rather than failed - an outage or a rename in somebody else's repository is not a verdict about it.
<ul>${failures.map((f) => `<li><code>${esc(f.name)}</code> - ${esc(f.why)}</li>`).join("")}</ul></div>`;
  return `<h1>The family registry</h1>
<p class="meta">Measured <strong>${esc(measuredAt)}</strong>${catalogueSha ? ` &middot; catalogue <code>${esc(catalogueSha)}</code>` : ""} &middot; every member graded at the sha the catalogue pins</p>
<p class="scope">${esc(TIER_SCOPE_SENTENCE)} <a href="${LIMITATIONS_URL}">What a tier does not certify</a>.</p>
<p>This page is the <strong>measurement</strong>, regenerated on every deploy so its date cannot drift from its numbers. What the columns mean, why the collection reads as it does, what would turn it green, and the record of the episode in which an earlier hand-run version of this page carried a false verdict all live on <a href="${NARRATIVE_URL}">the family registry reference page</a>, which no generator overwrites.</p>
${notMeasured}`;
}

/** The page written when the catalogue itself could not be read. Dated, honest, and not a stale table. */
export function renderUnmeasurable({ measuredAt, why }) {
  return page({
    title: "The family registry - could not measure this deploy",
    body: `<h1>The family registry</h1>
<p class="meta">Attempted <strong>${esc(measuredAt)}</strong></p>
<div class="note"><strong>This deploy could not measure the collection.</strong> The catalogue could not be read, so nothing below would be a fact about the family - and a page showing the previous deploy's numbers under today's date would be worse than this one. <br><br>Reported reason: <code>${esc(why)}</code></div>
<p class="scope">${esc(TIER_SCOPE_SENTENCE)} <a href="${LIMITATIONS_URL}">What a tier does not certify</a>.</p>
<p>The next deploy re-measures. For what the registry means and how it is produced, see <a href="${NARRATIVE_URL}">the family registry reference page</a>.</p>`,
  });
}

/**
 * Splice the banner into the shipped evaluator's HTML.
 *
 * The collection table itself is rendered by `evaluate.mjs --format html`, never by this file: that is
 * the renderer the docs tell a consumer to run, and a registry page drawn by a second implementation
 * could disagree with the command it tells readers to reproduce it with. Only the provenance banner is
 * ours. If the insertion point is ever gone the banner is PREPENDED instead of dropped - a page that
 * silently loses its measurement date is the exact defect this generator exists to prevent.
 */
export function withBanner(evaluatorHtml, banner) {
  const m = evaluatorHtml.match(/<body[^>]*>/i);
  if (!m) return `${banner}\n${evaluatorHtml}`;
  const at = m.index + m[0].length;
  return `${evaluatorHtml.slice(0, at)}\n<main>${banner}</main>\n${evaluatorHtml.slice(at)}`;
}

export function parseArgs(argv) {
  const opts = { out: null, workDir: null, catalogueUrl: CATALOGUE_URL, catalogueRef: CATALOGUE_REF };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--out") opts.out = argv[++i] ?? null;
    else if (a === "--work-dir") opts.workDir = argv[++i] ?? null;
    else if (a === "--catalogue-url") opts.catalogueUrl = argv[++i] ?? null;
    else if (a === "--catalogue-ref") opts.catalogueRef = argv[++i] ?? null;
    else return { error: `unrecognized argument: ${a}` };
  }
  if (!opts.out) return { error: "--out <file> is required" };
  if (!opts.workDir) return { error: "--work-dir <dir> is required" };
  return opts;
}

const USAGE = `Usage: node scripts/gen-family-registry.mjs --out <file> --work-dir <dir> [options]

  --out <file>            where to write the generated registry page
  --work-dir <dir>        scratch directory for the catalogue and member checkouts
  --catalogue-url <url>   default ${CATALOGUE_URL}
  --catalogue-ref <ref>   default ${CATALOGUE_REF}

Exit: 0 a page was written (measured OR honestly could-not-measure) | 1 no page could be written
      | 2 the arguments were unusable`;

export function main(argv = process.argv.slice(2), deps = {}) {
  const opts = parseArgs(argv);
  if (opts.help) { console.log(USAGE); return 0; }
  if (opts.error) { console.error(`gen-family-registry: ${opts.error}`); return 2; }

  const fetchOne = deps.fetchAtSha ?? fetchAtSha;
  const measuredAt = (deps.today ?? (() => new Date().toISOString().slice(0, 10)))();
  const out = path.resolve(opts.out);
  const work = path.resolve(opts.workDir);
  const catDir = path.join(work, "catalogue");
  const memDir = path.join(work, "members");

  const write = (html) => {
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, html);
  };

  // 1. The catalogue. Its ref is a moving branch, so it is fetched by ref and its resolved sha recorded -
  //    the page must say WHICH catalogue commit it measured, or "in sync" means nothing.
  if (existsSync(catDir)) rmSync(catDir, { recursive: true, force: true });
  const gotCat = fetchOne({ url: opts.catalogueUrl, sha: opts.catalogueRef, dir: catDir });
  if (!gotCat.ok) {
    write(renderUnmeasurable({ measuredAt, why: gotCat.why }));
    console.log(`gen-family-registry: catalogue unreachable, wrote the could-not-measure page (${gotCat.why})`);
    return 0;
  }
  const head = spawnSync("git", ["rev-parse", "--short=7", "HEAD"], { cwd: catDir, encoding: "utf8" });
  const catalogueSha = head.status === 0 ? (head.stdout ?? "").trim() : null;

  const manifest = readJsonSafe(path.join(catDir, MANIFEST_REL));
  if (!manifest.data || !Array.isArray(manifest.data.plugins)) {
    write(renderUnmeasurable({ measuredAt, why: `${MANIFEST_REL} is missing or has no plugins array` }));
    console.log("gen-family-registry: catalogue manifest unreadable, wrote the could-not-measure page");
    return 0;
  }

  // 2. The members, each at its pin. Failures are collected, never thrown: one unreachable member must
  //    degrade one row, not the page.
  if (existsSync(memDir)) rmSync(memDir, { recursive: true, force: true });
  mkdirSync(memDir, { recursive: true });
  const { fetched, failed } = fetchMembers(manifest.data.plugins, memDir, fetchOne);

  // 3. The grade, from the shipped evaluator - the same command the page tells readers to reproduce with.
  const evalOut = path.join(work, "registry-raw.html");
  const r = spawnSync(
    process.execPath,
    [path.join(REPO, "scripts/evaluate.mjs"), catDir, "--members", memDir, "--format", "html", "--out", evalOut],
    { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  // A non-zero exit is the COLLECTION VERDICT, not a failure of this generator: the family is red today
  // and publishing that is the point. Only a missing output file means nothing was rendered.
  if (!existsSync(evalOut)) {
    const why = `the evaluator wrote no report (exit ${r.status})${r.stderr ? `: ${String(r.stderr).trim().slice(0, 300)}` : ""}`;
    write(renderUnmeasurable({ measuredAt, why }));
    console.log(`gen-family-registry: ${why}; wrote the could-not-measure page`);
    return 0;
  }

  const banner = renderBanner({ measuredAt, catalogueSha, failures: failed });
  write(withBanner(readFileSync(evalOut, "utf8"), banner));
  console.log(
    `gen-family-registry: measured ${fetched.length}/${manifest.data.plugins.length} member(s) at catalogue ${catalogueSha ?? "unknown"}` +
      (failed.length ? `; ${failed.length} not measured: ${failed.map((f) => f.name).join(", ")}` : ""),
  );
  return 0;
}

if (process.argv[1]?.endsWith("gen-family-registry.mjs")) process.exit(main());
