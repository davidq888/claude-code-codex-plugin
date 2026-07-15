#!/usr/bin/env node

import { cp, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PLUGIN_NAME = "claude-code";
const scriptPath = fileURLToPath(import.meta.url);
const sourceRoot = path.resolve(path.dirname(scriptPath), "..");

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function parseArgs(argv) {
  const options = { action: "install", destinationRoot: os.homedir(), force: false };
  const args = [...argv];
  if (args[0] && !args[0].startsWith("--")) {
    options.action = args.shift();
  }
  while (args.length) {
    const flag = args.shift();
    if (flag === "--force") {
      options.force = true;
    } else if (flag === "--destination-root") {
      const value = args.shift();
      if (!value) {
        throw new Error("--destination-root requires a path.");
      }
      options.destinationRoot = value;
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
  }
  if (!["install", "update", "uninstall"].includes(options.action)) {
    throw new Error("Action must be install, update, or uninstall.");
  }
  return options;
}

function installationPaths(destinationRoot) {
  const root = path.resolve(destinationRoot);
  const pluginsRoot = path.join(root, "plugins");
  const pluginRoot = path.join(pluginsRoot, PLUGIN_NAME);
  const marketplacePath = path.join(root, ".agents", "plugins", "marketplace.json");
  if (path.dirname(pluginRoot) !== pluginsRoot) {
    throw new Error("Resolved plugin path escaped the plugins directory.");
  }
  return { marketplacePath, pluginRoot, pluginsRoot, root };
}

async function readMarketplace(marketplacePath) {
  try {
    const parsed = JSON.parse(await readFile(marketplacePath, "utf8"));
    if (!Array.isArray(parsed.plugins)) {
      throw new Error("Marketplace plugins must be an array.");
    }
    return parsed;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    return {
      name: "personal",
      interface: { displayName: "Personal" },
      plugins: [],
    };
  }
}

async function writeMarketplace(marketplacePath, marketplace) {
  await mkdir(path.dirname(marketplacePath), { recursive: true });
  await writeFile(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function marketplaceEntry() {
  return {
    name: PLUGIN_NAME,
    source: { source: "local", path: `./plugins/${PLUGIN_NAME}` },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Productivity",
  };
}

async function configureMarketplace(marketplacePath) {
  const marketplace = await readMarketplace(marketplacePath);
  marketplace.plugins = marketplace.plugins.filter((entry) => entry?.name !== PLUGIN_NAME);
  marketplace.plugins.push(marketplaceEntry());
  await writeMarketplace(marketplacePath, marketplace);
}

async function removeMarketplaceEntry(marketplacePath) {
  if (!(await exists(marketplacePath))) {
    return;
  }
  const marketplace = await readMarketplace(marketplacePath);
  marketplace.plugins = marketplace.plugins.filter((entry) => entry?.name !== PLUGIN_NAME);
  await writeMarketplace(marketplacePath, marketplace);
}

async function writeMcpConfig(configRoot, installedPluginRoot = configRoot) {
  const config = {
    mcpServers: {
      "claude-code-local": {
        type: "stdio",
        command: process.execPath,
        args: [path.join(installedPluginRoot, "scripts", "claude-code-mcp.js")],
      },
    },
  };
  await writeFile(path.join(configRoot, ".mcp.json"), `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

async function installPlugin(options) {
  const paths = installationPaths(options.destinationRoot);
  const installed = await exists(paths.pluginRoot);
  if (options.action === "install" && installed && !options.force) {
    throw new Error(`Plugin already exists at ${paths.pluginRoot}. Use update or --force.`);
  }

  if (path.resolve(sourceRoot) === path.resolve(paths.pluginRoot)) {
    await writeMcpConfig(paths.pluginRoot);
  } else {
    await mkdir(paths.pluginsRoot, { recursive: true });
    const stagingRoot = await mkdtemp(path.join(paths.pluginsRoot, `.${PLUGIN_NAME}-stage-`));
    try {
      await cp(sourceRoot, stagingRoot, { recursive: true, errorOnExist: true });
      await writeMcpConfig(stagingRoot, paths.pluginRoot);
      if (installed) {
        await rm(paths.pluginRoot, { recursive: true, force: true });
      }
      await rename(stagingRoot, paths.pluginRoot);
    } finally {
      await rm(stagingRoot, { recursive: true, force: true });
    }
  }

  await configureMarketplace(paths.marketplacePath);
  return paths;
}

async function uninstallPlugin(destinationRoot) {
  const paths = installationPaths(destinationRoot);
  await rm(paths.pluginRoot, { recursive: true, force: true });
  await removeMarketplaceEntry(paths.marketplacePath);
  return paths;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.action === "uninstall") {
    const paths = await uninstallPlugin(options.destinationRoot);
    console.log(`Uninstalled ${PLUGIN_NAME} from ${paths.pluginRoot}`);
    return;
  }
  const paths = await installPlugin(options);
  console.log(`${options.action === "update" ? "Updated" : "Installed"} ${PLUGIN_NAME} at ${paths.pluginRoot}`);
  console.log("Start a new Codex task, then enable Claude Code from the Personal marketplace.");
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === path.resolve(scriptPath)) {
  main().catch((error) => {
    console.error(error.message || String(error));
    process.exitCode = 1;
  });
}

export {
  installPlugin,
  installationPaths,
  parseArgs,
  readMarketplace,
  removeMarketplaceEntry,
  uninstallPlugin,
};
