// Reads one build's stream-json transcript and working folder, and reports the section 6 build record.
//
// It answers whether the arm's method ran. It also estimates spend from token counts at list prices,
// because nested tools and the optimiser's child sessions report no single cost figure.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Dollars per million tokens, from the maintainer's routing reference, dated 2026-07-04.
const PRICES = { haiku: [1, 5], sonnet: [3, 15], opus: [5, 25], fable: [10, 50] };

function priceFor(model = '') {
  const tier = Object.keys(PRICES).find((name) => model.toLowerCase().includes(name));
  return PRICES[tier ?? 'sonnet'];
}

/** Estimate dollars for one usage block. Cache reads cost 0.1 of input, and cache writes cost 1.25. */
export function usageCost(usage = {}, model) {
  const [input, output] = priceFor(model);
  const dollars =
    (usage.input_tokens ?? 0) * input +
    (usage.cache_creation_input_tokens ?? 0) * input * 1.25 +
    (usage.cache_read_input_tokens ?? 0) * input * 0.1 +
    (usage.output_tokens ?? 0) * output;
  return dollars / 1e6;
}

/** Tally JSONL session text, counting each API message once however many blocks repeat it. */
export function tallySessions(jsonlText) {
  const seen = new Map();
  for (const line of jsonlText.split('\n')) {
    if (!line.trim().startsWith('{')) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const message = entry.message;
    if (!message?.usage || !message.id) continue;
    seen.set(message.id, message);
  }
  let dollars = 0;
  const tokens = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
  for (const message of seen.values()) {
    dollars += usageCost(message.usage, message.model);
    tokens.input += message.usage.input_tokens ?? 0;
    tokens.cacheWrite += message.usage.cache_creation_input_tokens ?? 0;
    tokens.cacheRead += message.usage.cache_read_input_tokens ?? 0;
    tokens.output += message.usage.output_tokens ?? 0;
  }
  return { messages: seen.size, dollars, tokens };
}

/** List the tool calls in a stream-json transcript, each joined to its result. */
export function toolCalls(streamText) {
  const calls = new Map();
  for (const line of streamText.split('\n')) {
    if (!line.trim().startsWith('{')) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === 'tool_use') calls.set(block.id, { name: block.name, input: block.input ?? {}, isError: null, result: '' });
      if (block.type === 'tool_result' && calls.has(block.tool_use_id)) {
        const call = calls.get(block.tool_use_id);
        call.isError = block.is_error === true;
        call.result = typeof block.content === 'string' ? block.content : JSON.stringify(block.content ?? '');
      }
    }
  }
  return [...calls.values()];
}

function findFiles(dir, name, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== 'node_modules') findFiles(path, name, found);
    } else if (entry === name) {
      found.push(path);
    }
  }
  return found;
}

/** The final result line of a stream-json transcript: cost, turns and how the session ended. */
export function finalResult(streamText) {
  const lines = streamText.split('\n').filter((line) => line.includes('"type":"result"'));
  if (lines.length === 0) return null;
  try {
    const result = JSON.parse(lines[lines.length - 1]);
    return { subtype: result.subtype, isError: result.is_error, costUsd: result.total_cost_usd, turns: result.num_turns, durationMs: result.duration_ms };
  } catch {
    return null;
  }
}

/**
 * Find nested `claude plugin eval` runs in the transcript. A builder can delete its result files,
 * so the transcript is the record that survives. A run counts as finished when its summary line
 * appears and it neither failed to sign in nor stopped part way.
 */
export function nestedEvals(calls) {
  return calls
    .filter((c) => c.name === 'Bash' && /claude plugin eval(?!\s+(init|--help))/.test(c.input.command ?? ''))
    .map((c) => {
      const summary = c.result.match(/case\(s\) · [^\n]*/);
      const cost = summary?.[0].match(/\$([0-9.]+)/);
      const failed = /Not logged in|authentication failed|partial/i.test(summary?.[0] ?? c.result);
      return { finished: Boolean(summary) && !failed, reportedUsd: cost ? Number(cost[1]) : null };
    });
}

/** Report the build record for one arm, per section 6. */
export function buildRecord({ arm, streamText, workDir, skillName }) {
  const calls = toolCalls(streamText);
  const skillCalls = calls.filter((c) => c.name === 'Skill');
  const named = (name) => skillCalls.filter((c) => String(c.input.skill ?? '').includes(name));
  const bash = calls.filter((c) => c.name === 'Bash');
  const ranOk = (pattern) => bash.filter((c) => pattern.test(c.input.command ?? '') && c.isError === false);
  const skillFile = join(workDir, 'skills', skillName, 'SKILL.md');
  const nestedResults = findFiles(workDir, 'aggregate-result.json');
  const nestedEvalSpend = nestedResults.reduce((sum, path) => {
    try {
      return sum + (JSON.parse(readFileSync(path, 'utf8')).costUsd ?? 0);
    } catch {
      return sum;
    }
  }, 0);

  const record = {
    arm,
    skillFinished: existsSync(skillFile),
    final: finalResult(streamText),
    skillInvocations: skillCalls.map((c) => ({ skill: c.input.skill, args: c.input.args ?? null })),
    nestedEvalSpendUsd: nestedEvalSpend,
    toolCounts: calls.reduce((counts, c) => ({ ...counts, [c.name]: (counts[c.name] ?? 0) + 1 }), {}),
  };

  const evals = nestedEvals(calls);
  record.nestedEvalCommands = evals.length;
  record.nestedEvalSpendFromTranscriptUsd = evals.reduce((sum, e) => sum + (e.reportedUsd ?? 0), 0);

  if (arm === 'toolkit') {
    record.builderInvoked = named('askit-build-skill').length > 0;
    record.nestedEvalFinished = Math.max(nestedResults.length, evals.filter((e) => e.finished).length);
    record.improveModeCount = named('askit-build-skill').filter((c) => /improve/i.test(String(c.input.args ?? ''))).length;
    record.createOnly = record.improveModeCount === 0;
    record.methodRan = record.builderInvoked && record.nestedEvalFinished > 0;
  } else {
    record.builderInvoked = named('skill-creator').length > 0;
    const benchmarks = findFiles(workDir, 'benchmark.json');
    const optimiser = ranOk(/run_loop/);
    record.benchmarkFinished = benchmarks.length;
    record.optimiserCommands = optimiser.length;
    record.optimiserResultFiles = findFiles(workDir, 'results.json').length;
    record.methodRan = record.builderInvoked && benchmarks.length > 0 && optimiser.length > 0;
  }
  return record;
}
