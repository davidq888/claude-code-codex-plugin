#!/usr/bin/env node

const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");

let buffer = "";
let activeToolCall = false;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_REQUEST_BYTES = 1024 * 1024;
const SAFE_ENV_KEYS = process.platform === "win32"
  ? [
    "APPDATA", "ComSpec", "HOMEDRIVE", "HOMEPATH", "HOME", "LOCALAPPDATA",
    "OS", "PATH", "PATHEXT", "PROGRAMDATA", "SystemRoot", "TEMP", "TMP",
    "USERPROFILE", "WINDIR",
  ]
  : ["HOME", "LANG", "LC_ALL", "PATH", "TMPDIR", "XDG_CACHE_HOME", "XDG_CONFIG_HOME"];

function respond(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function reject(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

function resolveCommand(command) {
  const check = spawnSync(
    process.platform === "win32" ? "where.exe" : "command",
    process.platform === "win32" ? [command] : ["-v", command],
    { encoding: "utf8" }
  );
  if (check.status !== 0) {
    return null;
  }
  const matches = check.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (process.platform === "win32") {
    return matches.find((line) => /\.(cmd|exe|bat|ps1)$/i.test(line)) || matches[0] || command;
  }
  return matches[0] || command;
}

function trustedClaudeExecutable() {
  if (process.platform === "win32") {
    const home = process.env.USERPROFILE || process.env.HOME || "";
    const candidates = [
      process.env.APPDATA && path.join(
        process.env.APPDATA,
        "npm",
        "node_modules",
        "@anthropic-ai",
        "claude-code",
        "bin",
        "claude.exe"
      ),
      home && path.join(home, ".local", "bin", "claude.exe"),
    ].filter(Boolean);
    return candidates.find((candidate) => {
      try {
        return fs.statSync(candidate).isFile();
      } catch {
        return false;
      }
    }) || null;
  }

  const resolved = resolveCommand("claude");
  return resolved && !/\.(cmd|bat|ps1)$/i.test(resolved) ? resolved : null;
}

function commandExists() {
  return Boolean(trustedClaudeExecutable());
}

function safeEnvironment() {
  return Object.fromEntries(
    SAFE_ENV_KEYS
      .filter((key) => typeof process.env[key] === "string")
      .map((key) => [key, process.env[key]])
  );
}

function appendOutput(output, chunk) {
  const remaining = MAX_OUTPUT_BYTES - Buffer.byteLength(output, "utf8");
  if (remaining <= 0) {
    return output;
  }
  const text = chunk.toString();
  if (Buffer.byteLength(text, "utf8") <= remaining) {
    return output + text;
  }
  return `${output}${text.slice(0, remaining)}\n[Output truncated.]`;
}

function terminateProcessTree(child) {
  if (!child.pid) {
    return;
  }
  if (process.platform === "win32") {
    const systemRoot = process.env.SystemRoot || process.env.WINDIR;
    const taskkill = systemRoot && path.join(systemRoot, "System32", "taskkill.exe");
    if (taskkill && fs.existsSync(taskkill)) {
      spawnSync(taskkill, ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true });
      return;
    }
    child.kill();
    return;
  }
  child.kill("SIGTERM");
}

function runClaude(args, options = {}) {
  return new Promise((resolve) => {
    const executable = trustedClaudeExecutable();
    if (!executable) {
      resolve({ code: 1, stdout: "", stderr: "Trusted Claude Code executable was not found." });
      return;
    }
    const child = spawn(executable, args, {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true,
      env: safeEnvironment(),
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timeout;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve(result);
    };
    timeout = setTimeout(() => {
      terminateProcessTree(child);
      finish({ code: 124, stdout, stderr: `${stderr}\nTimed out and terminated the Claude process tree.`.trim() });
    }, options.timeoutMs || 120000);
    child.stdout.on("data", (chunk) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendOutput(stderr, chunk);
    });
    child.on("error", (error) => {
      finish({ code: 1, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      finish({ code, stdout, stderr });
    });
  });
}

function text(content) {
  return { content: [{ type: "text", text: content }] };
}

function startLogin() {
  return new Promise((resolve, reject) => {
    const executable = trustedClaudeExecutable();
    if (!executable) {
      reject(new Error("Trusted Claude Code executable was not found."));
      return;
    }
    const child = spawn(executable, ["auth", "login"], {
      cwd: process.cwd(),
      detached: true,
      shell: false,
      stdio: "ignore",
      windowsHide: false,
      env: safeEnvironment(),
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

async function callTool(name, args) {
  if (name === "claude_code_status") {
    if (!commandExists()) {
      return text([
        "A trusted Claude Code CLI installation was not found.",
        "",
        "Install options:",
        "- PowerShell: irm https://claude.ai/install.ps1 | iex",
        "- npm: npm install -g @anthropic-ai/claude-code",
        "",
        "After installing, run `claude` in an interactive terminal and complete the browser login.",
      ].join("\n"));
    }

    const version = await runClaude(["--safe-mode", "--version"], { timeoutMs: 30000 });
    const doctor = await runClaude(["--safe-mode", "doctor"], { timeoutMs: 60000 });
    return text([
      "Claude Code CLI is available.",
      "",
      "Version:",
      version.stdout.trim() || version.stderr.trim() || `exit ${version.code}`,
      "",
      "Doctor:",
      doctor.stdout.trim() || doctor.stderr.trim() || `exit ${doctor.code}`,
      "",
      "If authentication is missing or expired, run `claude` and use `/login`.",
    ].join("\n"));
  }

  if (name === "claude_code_login") {
    if (!commandExists()) {
      throw new Error("A trusted Claude Code CLI installation was not found. Run `claude_code_status` for setup steps.");
    }

    await startLogin();
    return text([
      "Started Claude Code sign-in.",
      "",
      "Your browser should open to Anthropic's login page. Complete the confirmation there, then run `claude_code_status` again to verify the account is connected.",
    ].join("\n"));
  }

  if (name === "claude_code_prompt") {
    const prompt = String(args?.prompt || "").trim();
    const timeoutSeconds = Number(args?.timeoutSeconds || 120);
    const permissionMode = String(args?.permissionMode || "manual");
    const permissionModes = new Set(["manual", "plan"]);
    if (!prompt) {
      throw new Error("Missing required `prompt`.");
    }
    if (prompt.length > 200000) {
      throw new Error("`prompt` exceeds the 200,000 character limit.");
    }
    if (!permissionModes.has(permissionMode)) {
      throw new Error("Invalid `permissionMode`. Use manual or plan.");
    }
    if (!commandExists()) {
      throw new Error("A trusted Claude Code CLI installation was not found. Run `claude_code_status` for setup steps.");
    }

    const result = await runClaude(["--safe-mode", "--permission-mode", permissionMode, "-p", prompt], {
      timeoutMs: Math.max(10, Math.min(timeoutSeconds, 600)) * 1000,
    });
    return text([
      `Exit code: ${result.code}`,
      `Permission mode: ${permissionMode}`,
      "",
      "stdout:",
      result.stdout.trim() || "(empty)",
      "",
      "stderr:",
      result.stderr.trim() || "(empty)",
    ].join("\n"));
  }

  throw new Error(`Unknown tool: ${name}`);
}

const tools = [
  {
    name: "claude_code_status",
    description: "Check whether the local Claude Code CLI is installed, reachable, and likely ready for account-backed use.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "claude_code_login",
    description: "Open the official Claude Code browser sign-in flow for the local Claude account. This never reads or stores credentials.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "claude_code_prompt",
    description: "Run Claude Code only in the current Codex task workspace with manual approval and Claude safe mode. Autonomous write and command modes are not available through this MCP server.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Prompt to send to Claude Code.",
        },
        timeoutSeconds: {
          type: "number",
          description: "Maximum runtime in seconds, from 10 to 600.",
        },
        permissionMode: {
          type: "string",
          enum: ["manual", "plan"],
          description: "Claude Code permission mode. Defaults to manual. Autonomous modes are not available through this MCP server.",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
];

async function handle(message) {
  const { id, method, params } = message;
  try {
    if (method === "initialize") {
      respond(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "claude-code-local", version: "0.1.0" },
      });
      return;
    }
    if (method === "notifications/initialized") {
      return;
    }
    if (method === "tools/list") {
      respond(id, { tools });
      return;
    }
    if (method === "tools/call") {
      if (activeToolCall) {
        reject(id, -32001, "Another Claude Code tool call is already running. Retry after it completes.");
        return;
      }
      activeToolCall = true;
      try {
        respond(id, await callTool(params?.name, params?.arguments || {}));
      } finally {
        activeToolCall = false;
      }
      return;
    }
    reject(id, -32601, `Unsupported method: ${method}`);
  } catch (error) {
    reject(id, -32000, error.message || String(error));
  }
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  if (Buffer.byteLength(buffer, "utf8") > MAX_REQUEST_BYTES) {
    buffer = "";
    reject(null, -32700, "JSON-RPC message exceeds the 1 MiB limit.");
    return;
  }
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) {
      continue;
    }
    try {
      handle(JSON.parse(line));
    } catch (error) {
      reject(null, -32700, error.message || String(error));
    }
  }
});
