# Claude Code Plugin for Codex

This is a portable Windows distribution of the Claude Code plugin. It never includes your Claude
account credentials. Each recipient signs in through their own local Claude Code CLI.

## Install

1. Extract the folder to a local directory.
2. In PowerShell, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Use `-Force` only when intentionally replacing an existing `claude-code` plugin installation. The
optional `-DestinationRoot <path>` argument is useful for an isolated or test installation.

The installer requires Node.js, copies the plugin to `~/plugins/claude-code`, writes local MCP paths
for that machine, and adds the plugin to the recipient's Personal marketplace.

## Use

Start a new Codex task, enable the plugin from the Personal marketplace if necessary, then use
`claude_code_login` to authenticate the recipient's own Claude account.
