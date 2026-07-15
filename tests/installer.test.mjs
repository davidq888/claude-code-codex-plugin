import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import {
  installPlugin,
  installationPaths,
  parseArgs,
  uninstallPlugin,
} from "../plugins/claude-code/scripts/install.mjs";

test("parses installer actions without accepting unknown options", () => {
  assert.deepEqual(parseArgs(["update", "--destination-root", "target", "--force"]), {
    action: "update",
    destinationRoot: "target",
    force: true,
  });
  assert.throws(() => parseArgs(["install", "--unknown"]), /Unknown option/);
  assert.throws(() => parseArgs(["destroy"]), /Action must be/);
});

test("installs, replaces stale files, and uninstalls in an isolated root", async (context) => {
  const destinationRoot = await mkdtemp(path.join(os.tmpdir(), "claude-code-plugin-test-"));
  context.after(() => rm(destinationRoot, { recursive: true, force: true }));
  const paths = installationPaths(destinationRoot);

  await mkdir(path.dirname(paths.marketplacePath), { recursive: true });
  await writeFile(paths.marketplacePath, JSON.stringify({
    name: "personal",
    interface: { displayName: "My Personal Plugins" },
    plugins: [{ name: "unrelated", source: { source: "local", path: "./plugins/unrelated" } }],
  }));

  await installPlugin({ action: "install", destinationRoot, force: false });
  const mcp = JSON.parse(await readFile(path.join(paths.pluginRoot, ".mcp.json"), "utf8"));
  assert.equal(mcp.mcpServers["claude-code-local"].command, process.execPath);
  assert.equal(
    mcp.mcpServers["claude-code-local"].args[0],
    path.join(paths.pluginRoot, "scripts", "claude-code-mcp.js")
  );

  let marketplace = JSON.parse(await readFile(paths.marketplacePath, "utf8"));
  assert.equal(marketplace.interface.displayName, "My Personal Plugins");
  assert.deepEqual(marketplace.plugins.map((entry) => entry.name), ["unrelated", "claude-code"]);

  await writeFile(path.join(paths.pluginRoot, "stale-file.txt"), "stale");
  await installPlugin({ action: "update", destinationRoot, force: false });
  await assert.rejects(readFile(path.join(paths.pluginRoot, "stale-file.txt")), /ENOENT/);

  await uninstallPlugin(destinationRoot);
  await assert.rejects(readFile(path.join(paths.pluginRoot, ".mcp.json")), /ENOENT/);
  marketplace = JSON.parse(await readFile(paths.marketplacePath, "utf8"));
  assert.deepEqual(marketplace.plugins.map((entry) => entry.name), ["unrelated"]);
});
