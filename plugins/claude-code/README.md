# Claude Code Plugin for OpenAI Codex

This is the portable Windows distribution of a Claude Code plugin for OpenAI Codex. It lets Codex
check a local Anthropic Claude Code CLI, open the official Claude login page, and run safe,
workspace-scoped Claude Code prompts.

The plugin never includes Claude account credentials, API keys, tokens, or personal account data.
Each recipient signs in through their own local Claude Code CLI.

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

Available tools:

- `claude_code_status`: check Claude Code CLI installation, version, doctor output, and account readiness.
- `claude_code_login`: open the official Claude Code sign-in flow.
- `claude_code_prompt`: run Claude Code with safe mode in the current Codex workspace.

Search terms: Claude Code Codex plugin, Anthropic Claude CLI, Claude Code MCP server, Codex Personal
marketplace plugin, OpenAI Codex developer tools.
