// what-it-is:   golden example 3 for askit-build-mcp - a runnable stdio MCP server that exposes
//               resources alongside a tool
// what-it-does: speaks newline-delimited JSON-RPC 2.0 on stdin/stdout, answering initialize,
//               resources/list, resources/read, tools/list and tools/call
// why:          the resources are advertised BY THE SERVER at the handshake, which is why they must not
//               be copied into the .mcp.json entry (sec 3.9 describes the protocol surface, not a schema)
// used-by:      skills/askit-build-mcp/examples/golden-3-resources-server.md; installed in that
//               example's demo plugin as mcp/team-conventions-server.mjs
import { createInterface } from "node:readline";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "team-conventions", version: "0.1.0" };

// The resource bodies are inlined so the example is dependency-free and launchable anywhere. A real
// server would read them from ${CLAUDE_PLUGIN_ROOT} or from the service it fronts.
const RESOURCES = [
  {
    uri: "conventions://naming",
    name: "Naming conventions",
    description: "How components are named in this team's plugins.",
    mimeType: "text/markdown",
    text: "# Naming\n\n- Skill directories and skill names are kebab-case and identical.\n- Tool names are snake_case.\n",
  },
  {
    uri: "conventions://review",
    name: "Review conventions",
    description: "What a reviewer checks before approving a plugin change.",
    mimeType: "text/markdown",
    text: "# Review\n\n- Every generated manifest is regenerated, never hand-edited.\n- Every secret is an env-var name.\n",
  },
];

const TOOLS = [
  {
    name: "check_name",
    description: "Report whether a component name follows the kebab-case convention.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "The component name to check." } },
      required: ["name"],
    },
  },
];

const ok = (id, value) => ({ jsonrpc: "2.0", id, result: value });
const fail = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

/** The list form omits the body: a client reads a resource by uri when it wants the content. */
const listed = ({ uri, name, description, mimeType }) => ({ uri, name, description, mimeType });

function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined || id === null) return null;
  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {}, resources: {} },
        serverInfo: SERVER_INFO,
      });
    case "resources/list":
      return ok(id, { resources: RESOURCES.map(listed) });
    case "resources/read": {
      const found = RESOURCES.find((r) => r.uri === params?.uri);
      if (!found) return fail(id, -32002, `resource not found: ${params?.uri}`);
      return ok(id, { contents: [{ uri: found.uri, mimeType: found.mimeType, text: found.text }] });
    }
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      if (params?.name !== "check_name") return fail(id, -32602, `unknown tool: ${params?.name}`);
      const value = params?.arguments?.name;
      if (typeof value !== "string") return fail(id, -32602, 'argument "name" must be a string');
      const conformant = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
      return ok(id, {
        content: [{ type: "text", text: conformant ? `"${value}" is kebab-case` : `"${value}" is not kebab-case` }],
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
