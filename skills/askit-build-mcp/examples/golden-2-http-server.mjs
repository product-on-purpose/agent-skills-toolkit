// what-it-is:   golden example 2 for askit-build-mcp - a runnable, dependency-free HTTP MCP server
// what-it-does: serves JSON-RPC 2.0 over node:http (POST, application/json), answering initialize,
//               tools/list and tools/call for one tool (get_status), with optional bearer auth read
//               from the EXAMPLE_STATUS_TOKEN environment variable
// why:          an http server has no bundled file to resolve, so the thing you must verify instead is
//               that the URL answers and that the token in .mcp.json is a variable NAME, not a value
// used-by:      skills/askit-build-mcp/examples/golden-2-http-server.md; stands in for the remote
//               service its .mcp.json entry reaches at https://status.example.com/mcp
import { createServer } from "node:http";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "service-status", version: "0.1.0" };
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8931);

// The credential arrives as an environment VALUE at runtime. .mcp.json only ever carries the NAME of
// this variable (bearer_token_env_var), never the value (Standard sec 9). Unset here means open, which
// keeps the example launchable without inventing a secret.
const EXPECTED_TOKEN = process.env.EXAMPLE_STATUS_TOKEN ?? "";

const TOOLS = [
  {
    name: "get_status",
    description: "Report the current health of a named service.",
    inputSchema: {
      type: "object",
      properties: { service: { type: "string", description: "The service to report on." } },
      required: ["service"],
    },
  },
];

const ok = (id, value) => ({ jsonrpc: "2.0", id, result: value });
const fail = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

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
      if (params?.name !== "get_status") return fail(id, -32602, `unknown tool: ${params?.name}`);
      const service = params?.arguments?.service;
      if (typeof service !== "string") return fail(id, -32602, 'argument "service" must be a string');
      return ok(id, {
        content: [{ type: "text", text: `${service}: operational, 0 open incidents` }],
        isError: false,
      });
    }
    default:
      return fail(id, -32601, `method not found: ${method}`);
  }
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(payload);
}

const server = createServer((req, res) => {
  if (req.method !== "POST") return send(res, 405, fail(null, -32600, "POST a JSON-RPC message"));
  if (EXPECTED_TOKEN) {
    const auth = req.headers.authorization ?? "";
    if (auth !== `Bearer ${EXPECTED_TOKEN}`) return send(res, 401, fail(null, -32001, "unauthorized"));
  }
  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
  });
  req.on("end", () => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return send(res, 400, fail(null, -32700, "parse error"));
    }
    const reply = handle(msg);
    if (!reply) {
      res.writeHead(202).end(); // a notification is accepted with no body
      return;
    }
    send(res, 200, reply);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  process.stderr.write(`service-status listening on http://127.0.0.1:${PORT}/mcp\n`);
});
