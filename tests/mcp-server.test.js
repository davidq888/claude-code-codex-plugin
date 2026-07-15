"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const serverPath = path.resolve(__dirname, "..", "plugins", "claude-code", "scripts", "claude-code-mcp.js");
const server = require(serverPath);

test("publishes only the three intended MCP tools", () => {
  assert.deepEqual(server.tools.map((tool) => tool.name), [
    "claude_code_status",
    "claude_code_login",
    "claude_code_prompt",
  ]);
  const promptTool = server.tools.find((tool) => tool.name === "claude_code_prompt");
  assert.deepEqual(promptTool.inputSchema.properties.permissionMode.enum, ["manual", "plan"]);
  assert.equal(promptTool.inputSchema.additionalProperties, false);
});

test("bounds timeouts and handles non-numeric input", () => {
  assert.equal(server.boundedTimeoutMs(undefined), 120000);
  assert.equal(server.boundedTimeoutMs("not-a-number"), 120000);
  assert.equal(server.boundedTimeoutMs(1), 10000);
  assert.equal(server.boundedTimeoutMs(900), 600000);
});

test("passes only allowlisted environment variables", () => {
  const secretName = "CLAUDE_CODE_PLUGIN_TEST_SECRET";
  process.env[secretName] = "must-not-pass";
  try {
    const environment = server.safeEnvironment();
    assert.equal(Object.hasOwn(environment, secretName), false);
    assert.equal(Object.hasOwn(environment, "PATH"), typeof process.env.PATH === "string");
  } finally {
    delete process.env[secretName];
  }
});

test("caps accumulated output", () => {
  const output = server.appendOutput("", Buffer.alloc(1024 * 1024 + 32, "a"));
  assert.match(output, /\[Output truncated\.\]$/);
  assert.ok(Buffer.byteLength(output, "utf8") <= 1024 * 1024);

  const multibyte = server.appendOutput("", Buffer.from("\u20ac".repeat(400000)));
  assert.match(multibyte, /\[Output truncated\.\]$/);
  assert.ok(Buffer.byteLength(multibyte, "utf8") <= 1024 * 1024);

  const nearlyFull = "a".repeat(1024 * 1024 - 5);
  assert.ok(Buffer.byteLength(server.appendOutput(nearlyFull, "overflow"), "utf8") <= 1024 * 1024);
});

test("rejects unsafe prompt modes before launching Claude", async () => {
  await assert.rejects(
    server.callTool("claude_code_prompt", { prompt: "test", permissionMode: "acceptEdits" }),
    /Invalid `permissionMode`/
  );
  await assert.rejects(
    server.callTool("claude_code_prompt", { prompt: "" }),
    /Missing required `prompt`/
  );
});

test("serves initialize and tools/list over stdio", async (context) => {
  const child = spawn(process.execPath, [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  context.after(() => child.kill());

  const responses = await new Promise((resolve, reject) => {
    const messages = [];
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => reject(new Error(`MCP response timed out: ${stderr}`)), 5000);
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      let index;
      while ((index = stdout.indexOf("\n")) >= 0) {
        const line = stdout.slice(0, index).trim();
        stdout = stdout.slice(index + 1);
        if (line) {
          messages.push(JSON.parse(line));
        }
      }
      if (messages.length === 2) {
        clearTimeout(timeout);
        resolve(messages);
      }
    });
    child.once("error", reject);
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`);
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`);
  });

  assert.equal(responses[0].result.serverInfo.version, "0.2.0");
  assert.equal(responses[1].result.tools.length, 3);
});
