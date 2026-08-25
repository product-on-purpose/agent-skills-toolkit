// what-it-is:   the prose metrics used by the documentation style report
// what-it-does: measures a markdown page for stacked sentences, heavy parentheticals, overlong paragraphs, and the mechanical vocabulary rules
// why:          "make it clearer" is an adjective and does not survive a handoff; these are the parts of style a script can count
// used-by:      imported by scripts/doc-style-report.mjs and tests/unit/prose-metrics.test.mjs
/**
 * Plainness measurement for this repository's markdown documentation.
 *
 * WHY NOT SENTENCE LENGTH. The v1.16.0 documentation passes already spent that
 * metric: the public corpus now has a median sentence of 12 words and only 4 percent
 * of sentences run over 35. What still reads as hard here is a different defect, and
 * it is the one the maintainer named in their own feedback: one sentence carrying
 * three or four ideas joined by semicolons, colons, dash asides and stacked
 * parentheses, with the reason for the claim buried inside the brackets.
 *
 * WHAT THIS MEASURES.
 *   clause load    how many idea-joins a sentence carries. Two or more makes it
 *                  "stacked", which is the one-idea-per-sentence rule, measured.
 *   heavy parens   a parenthetical over HEAVY_PAREN_CHARS. Short parentheses are
 *                  house style here (a reference ID must carry a handle, and the
 *                  handle is parenthetical). Long ones are where a reason hides.
 *   bracket share  the share of prose characters sitting inside parentheses.
 *   rule greps     the three mechanical rules already written into
 *                  skills/askit-build-docs/SKILL.md: no internal planning
 *                  vocabulary, no bare reference ID, define coined words.
 *
 * WHAT IT IS NOT. This is triage and packet evidence, not a CI gate. Every signal
 * here has a legitimate false-positive surface, which is exactly why it reports a
 * ranking for a human to read rather than an exit code.
 */
import { readFileSync } from 'node:fs';

const LONG_SENTENCE_WORDS = 35;
const HEAVY_PAREN_CHARS = 40;
const LONG_PARAGRAPH_CHARS = 400;

/* ------------------------------------------------------------------ stripping */

function stripFrontmatter(text) {
  if (!text.startsWith('---\n')) return text;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return text;
  const after = text.indexOf('\n', end + 1);
  return after === -1 ? '' : text.slice(after + 1);
}

function stripFences(text) {
  const out = [];
  let openMarker = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      const marker = m[1];
      if (openMarker === null) { openMarker = marker[0]; out.push(''); continue; }
      if (marker[0] === openMarker) { openMarker = null; out.push(''); continue; }
    }
    out.push(openMarker === null ? line : '');
  }
  return out.join('\n');
}

/** Replace an inline code span with placeholder words, preserving its word count.
 *  A filename's dot must not end a sentence, and a code span must not look like an
 *  aside. */
function protectInlineCode(text) {
  return text.replace(/`([^`\n]+)`/g, (_, inner) => {
    const n = inner.trim().split(/\s+/).filter(Boolean).length || 1;
    return Array(n).fill('CODE').join(' ');
  });
}

/** Links and inline HTML. Emphasis markers are deliberately left in place here: the
 *  definition-list form `**Term** - meaning` has to be recognisable during paragraph
 *  segmentation, and stripping the asterisks first would destroy it. */
function stripLinks(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/<https?:\/\/[^>]*>/g, '')
    .replace(/<[^>\n]{1,80}>/g, '');
}

function stripEmphasis(text) {
  return text.replace(/\*\*|__|\*/g, '');
}

/* -------------------------------------------------------- block segmentation */

const LIST_MARKER = /^(\s*)(?:[-*+]\s+|\d+[.)]\s+)/;

/** The two label forms this repository uses to put a name in front of its
 *  description: `**Term** - meaning` in the glossary and inventories, and
 *  `**Cause:** explanation` in the troubleshooting and reference pages. The
 *  separator in each is not an idea-join. A paragraph merely OPENING with a bold
 *  lead-in sentence is deliberately not matched. */
const DEFINITION_TERM = /^\*\*[^*]{1,60}\*\*\s+-\s|^\*\*[^*]{1,60}:\*\*\s|^\*\*[^*]{1,60}\*\*:\s/;

function toParagraphs(text) {
  const paragraphs = [];
  let current = [];
  let isListItem = false;

  const flush = () => {
    const joined = current.join(' ').replace(/\s+/g, ' ').trim();
    if (joined) {
      paragraphs.push({
        text: stripEmphasis(joined),
        isListItem,
        isDefinition: DEFINITION_TERM.test(joined),
      });
    }
    current = [];
    isListItem = false;
  };

  for (const raw of text.split('\n')) {
    let line = raw.replace(/^\s*>+\s?/, '');
    const bare = line.trim();

    if (!bare) { flush(); continue; }
    if (/^#{1,6}\s/.test(bare)) { flush(); continue; }
    if (/^\|/.test(bare)) { flush(); continue; }
    if (/^([-*_]\s*){3,}$/.test(bare)) { flush(); continue; }

    if (LIST_MARKER.test(line)) {
      flush();
      line = line.replace(LIST_MARKER, '');
      isListItem = true;
    }
    current.push(line.trim());
  }
  flush();
  return paragraphs;
}

/* ------------------------------------------------------------------ sentences */

function toSentences(paragraphText) {
  return paragraphText
    .split(/(?<=[.!?])["')\]]*\s+(?=[A-Z0-9"'(\[])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function wordCount(sentence) {
  return sentence.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

/** Parenthetical groups in a sentence, each as `{ text, start }`. */
function parenGroups(sentence) {
  const groups = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < sentence.length; i += 1) {
    const ch = sentence[i];
    if (ch === '(') { if (depth === 0) start = i + 1; depth += 1; }
    else if (ch === ')') {
      depth -= 1;
      if (depth <= 0) {
        if (start >= 0) groups.push({ text: sentence.slice(start, i), start });
        depth = 0;
        start = -1;
      }
    }
  }
  return groups;
}

/** A parenthetical that follows a reference ID is the HANDLE the house rules require
 *  ("ADR 0044 (one Standard ceiling...)"). Counting it as buried reasoning would make
 *  the instrument penalise the very rule this sweep enforces. */
const ID_BEFORE_HANDLE = /(?:ADR\s+\d{3,4}|\b[EUSG]\d{1,3})\s*$/;

function isRequiredHandle(sentence, groupStart) {
  const before = sentence.slice(Math.max(0, groupStart - 26), Math.max(0, groupStart - 1));
  return ID_BEFORE_HANDLE.test(before);
}

/** How far into a sentence a punctuation mark can sit and still be a label separator
 *  rather than an aside. */
const LABEL_HEAD_CHARS = 50;

/**
 * How many idea-joins this sentence carries.
 *
 * `hasLeadingLabel` discounts ONE leading separator, because two house forms put a
 * name in front of its description and neither is a second idea:
 *
 *   `**Term** - meaning`     the glossary and every inventory list
 *   `**Cause:** explanation` the troubleshooting and reference pages
 *
 * Only the earlier of the two, and only within the first LABEL_HEAD_CHARS, is
 * discounted. A colon deep in a sentence is doing real work and still counts.
 */
function analyseSentence(sentence, hasLeadingLabel) {
  const groups = parenGroups(sentence);
  const heavyParens = groups.filter(
    (g) => g.text.length > HEAVY_PAREN_CHARS && !isRequiredHandle(sentence, g.start),
  ).length;
  const bracketChars = groups.reduce((a, g) => a + g.text.length, 0);

  const semicolons = (sentence.match(/;/g) || []).length;
  let colons = (sentence.match(/:(?!\/)/g) || []).length;
  let dashAsides = (sentence.match(/\s-\s/g) || []).length;

  if (hasLeadingLabel) {
    const head = sentence.slice(0, LABEL_HEAD_CHARS);
    const dashAt = head.search(/\s-\s/);
    const colonAt = head.search(/:(?!\/)/);
    const colonFirst = colonAt >= 0 && (dashAt < 0 || colonAt < dashAt);
    if (colonFirst && colons > 0) colons -= 1;
    else if (dashAt >= 0 && dashAsides > 0) dashAsides -= 1;
  }

  const words = wordCount(sentence);
  const clauseLoad = groups.length + semicolons + colons + dashAsides;

  return {
    text: sentence,
    words,
    clauseLoad,
    heavyParens,
    bracketChars,
    stacked: clauseLoad >= 2,
    long: words > LONG_SENTENCE_WORDS,
  };
}

/* ---------------------------------------------------------------- rule greps */

/** Rule 2: internal planning vocabulary means nothing outside this repo, and rots. */
const PLANNING_VOCAB = /\b(?:W\d\b|wave\s+\d|workstream|release\s+packet|packet|phase\s+\d|P\d[ab]?\b)/gi;

/** Rule 4: a reference ID always carries a handle. */
const BACKLOG_ID = /\bE\d{1,3}\b/g;
const ADR_ID = /\bADR\s+\d{3,4}\b/g;

/** Rule 3: coined words this project invented. Product words (Bronze, Silver, Gold,
 *  tier) are deliberately absent: those need no gloss. */
const COINED = /\b(?:spine|burndown|emission|emit(?:s|ted|ting)?|conformance|declared-tier|Diataxis|reqId|round-trip|anti-example|golden)\b/gi;

function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

/** A reference ID counts as bare when no handle follows it and it is not a link label. */
function bareReferenceIds(rawText) {
  let bare = 0;
  const examine = (re) => {
    const rx = new RegExp(re.source, 'g');
    let match;
    while ((match = rx.exec(rawText)) !== null) {
      const end = match.index + match[0].length;
      const after = rawText.slice(end, end + 3);
      const before = rawText.slice(Math.max(0, match.index - 2), match.index);
      const hasHandle = /^\s*[(,]/.test(after) || /^\s+-\s/.test(after) || before.includes('[');
      if (!hasHandle) bare += 1;
    }
  };
  examine(BACKLOG_ID);
  examine(ADR_ID);
  return bare;
}

/* --------------------------------------------------------------- public API */

export function measureText(src) {
  const raw = src.replace(/\r\n/g, '\n');

  let text = stripFrontmatter(raw);
  text = stripFences(text);
  text = protectInlineCode(text);
  text = stripLinks(text);

  const paragraphs = toParagraphs(text);

  const sentences = [];
  for (const p of paragraphs) {
    const parts = toSentences(p.text);
    const leadDashIsSeparator = p.isListItem || p.isDefinition;
    parts.forEach((s, i) => sentences.push(analyseSentence(s, leadDashIsSeparator && i === 0)));
  }

  const measured = sentences.filter((s) => s.words > 0);
  const proseChars = paragraphs.reduce((a, p) => a + p.text.length, 0);
  const bracketChars = measured.reduce((a, s) => a + s.bracketChars, 0);
  const pct = (n) => (measured.length ? Math.round((n / measured.length) * 100) : 0);

  const sortedWords = measured.map((s) => s.words).sort((a, b) => a - b);
  const medianSentence = sortedWords.length ? sortedWords[sortedWords.length >> 1] : 0;
  const prose = paragraphs.map((p) => p.text).join('\n');

  return {
    paragraphs: paragraphs.length,
    sentences: measured.length,
    words: measured.reduce((a, s) => a + s.words, 0),

    medianSentence,
    over35: pct(measured.filter((s) => s.long).length),
    longestParagraph: paragraphs.reduce((m, p) => Math.max(m, p.text.length), 0),
    longParagraphs: paragraphs.filter((p) => p.text.length > LONG_PARAGRAPH_CHARS).length,

    stackedPct: pct(measured.filter((s) => s.stacked).length),
    stackedCount: measured.filter((s) => s.stacked).length,
    worstClauseLoad: measured.reduce((m, s) => Math.max(m, s.clauseLoad), 0),
    heavyParens: measured.reduce((a, s) => a + s.heavyParens, 0),
    bracketShare: proseChars ? Math.round((bracketChars / proseChars) * 100) : 0,

    planningVocab: countMatches(prose, PLANNING_VOCAB),
    bareIds: bareReferenceIds(prose),
    coinedTerms: countMatches(prose, COINED),

    _sentences: measured,
    _paragraphs: paragraphs,
  };
}

export function measureFile(path) {
  return { path, ...measureText(readFileSync(path, 'utf8')) };
}

/** A single number for ranking a rewrite queue. Weighted toward absolute counts, so
 *  a short page with one bad sentence does not outrank a long page with twenty. */
export function plainnessDebt(r) {
  return r.stackedCount * 3 + r.heavyParens * 2 + r.longParagraphs * 2 + r.planningVocab + r.bareIds;
}

/* ------------------------------------------------- page anatomy (style contract) */

/** Classify a page's body lines, with fenced regions marked, so the anatomy rules can
 *  ask what kind of block came first. Kept here rather than in the CLI so the rules are
 *  testable without running a report. */
export function bodyLines(src) {
  let text = src.replace(/\r\n/g, '\n');
  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) {
      const after = text.indexOf('\n', end + 1);
      text = after === -1 ? '' : text.slice(after + 1);
    }
  }
  const out = [];
  let open = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      if (open === null) { open = m[1][0]; out.push({ line, kind: 'fence' }); continue; }
      if (m[1][0] === open) { open = null; out.push({ line, kind: 'fence' }); continue; }
    }
    if (open !== null) { out.push({ line, kind: 'code' }); continue; }
    const bare = line.trim();
    if (!bare) out.push({ line, kind: 'blank' });
    else if (/^#{1,6}\s/.test(bare)) out.push({ line, kind: 'heading' });
    else if (/^\|/.test(bare)) out.push({ line, kind: 'table' });
    else if (/^([-*+]\s+|\d+[.)]\s+)/.test(bare)) out.push({ line, kind: 'list' });
    else out.push({ line, kind: 'prose' });
  }
  return out;
}

/** Does the page orient before it shows anything? A page that opens on a table or a
 *  code fence has started explaining to someone who does not yet know the subject. */
export function opensWithProse(lines) {
  let seenH1 = false;
  for (const l of lines) {
    if (l.kind === 'blank') continue;
    if (l.kind === 'heading') {
      if (!seenH1) { seenH1 = true; continue; }
      return false;
    }
    if (l.kind === 'prose') return true;
    return false;
  }
  return false;
}

/** Section headings that reach a fence or a table before any prose. This is rule 5,
 *  orientation before mechanism, made countable. */
export function sectionsWithoutOrientation(lines) {
  const offenders = [];
  let current = null;
  let sawProse = false;

  const close = () => {
    if (current && !sawProse) offenders.push(current);
    current = null;
    sawProse = false;
  };

  for (const l of lines) {
    if (l.kind === 'heading' && /^\s*##\s/.test(l.line)) {
      close();
      current = l.line.trim().replace(/^#+\s*/, '');
      sawProse = false;
      continue;
    }
    if (!current) continue;
    if (l.kind === 'prose' || l.kind === 'list') { sawProse = true; continue; }
    if ((l.kind === 'fence' || l.kind === 'table') && !sawProse) { close(); }
  }
  close();
  return offenders;
}

