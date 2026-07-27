// what-it-is:   golden example 1 for askit-build-mcp - a runnable, dependency-free stdio MCP server
// what-it-does: speaks newline-delimited JSON-RPC 2.0 on stdin/stdout, answering initialize, tools/list
//               and tools/call for one small tool (count_words)
// why:          a golden MCP example is one you have actually launched; U11 can prove .mcp.json is
//               well-formed and can never prove the process starts, so the example carries the proof
// used-by:      skills/askit-build-mcp/examples/golden-1-stdio-server.md; installed in that example's
//               demo plugin as mcp/text-stats-server.mjs and launched by its .mcp.json entry
import { createInterface } from "node:readline";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "text-stats", version: "0.1.0" };

const TOOLS = [
  {
    name: "count_words",
    description: "Count the words, lines, and characters in a block of text.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "The text to measure." } },
      required: ["text"],
    },
  },
];

const ok = (id, value) => ({ jsonrpc: "2.0", id, result: value });
const fail = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

function measure(text) {
  const trimmed = text.trim();
  return {
    words: trimmed === "" ? 0 : trimmed.split(/\s+/).length,
    lines: text.split("\n").length,
    characters: text.length,
  };
}

/** Map one decoded JSON-RPC request to its reply. Returns null for a notification (no `id`). */
function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined || id === null) return null;
  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      if (params?.name !== "count_words") return fail(id, -32602, `unknown tool: ${params?.name}`);
      const text = params?.arguments?.text;
      if (typeof text !== "string") return fail(id, -32602, 'argument "text" must be a string');
      const m = measure(text);
      return ok(id, {
        content: [{ type: "text", text: `${m.words} words, ${m.lines} lines, ${m.characters} characters` }],
        isError: false,
      });
    }
    default:
      return fail(id, -32601, `method not found: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (line.trim() === "") return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify(fail(null, -32700, "parse error")) + "\n");
    return;
  }
  const reply = handle(msg);
  if (reply) process.stdout.write(JSON.stringify(reply) + "\n");
});
