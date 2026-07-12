# Claude Code Codex Plugin for OpenAI Codex

Use Anthropic Claude Code from OpenAI Codex through a security-focused local plugin. This Codex
plugin connects to a user's authenticated Claude Code CLI, opens the official Claude login flow,
checks account status, and runs constrained Claude Code prompts from the current Codex workspace.

This project is useful for developers searching for a Claude Code Codex plugin, Claude Code MCP
server, Codex personal marketplace plugin, local Claude CLI integration, or a safe way to use Claude
Code and Codex together.

## Features

- Local Claude Code CLI status checks through `claude_code_status`.
- Official Anthropic browser login launch through `claude_code_login`.
- Safe Claude Code prompt execution through `claude_code_prompt`.
- Windows installer for Codex Personal marketplace setup.
- No stored Claude credentials, tokens, API keys, or account data.
- Safe mode, request limits, output limits, one-at-a-time execution, and process-tree cleanup.

## Install

Clone the repository, then run the Windows installer from the plugin directory:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\claude-code\install.ps1
```

The installer copies the plugin to the recipient's profile, writes machine-specific MCP paths, and
adds it to their Personal marketplace. Start a new Codex task after installation.

Each user authenticates their own Claude account through `claude_code_login`. The plugin opens the
official Claude Code sign-in flow and never stores credentials in this repository or copies them with
the installer.

## Usage

After installation, start a new Codex task and enable the Claude Code plugin from the Personal
marketplace if needed. Common prompts:

```text
Check my Claude Code account status.
Open Claude Code login.
Run Claude Code on this repo in plan mode.
Draft a Claude Code handoff prompt for this task.
```

## Security Model

- Claude Code runs through a signed local executable.
- MCP requests are size-limited and execute one at a time.
- Prompts run in the current Codex task workspace with Claude safe mode enabled.
- Autonomous permission modes are not exposed through the MCP server.
- Child process output is capped and timed-out process trees are terminated.

## Keywords

`claude-code`, `codex-plugin`, `openai-codex`, `anthropic-claude`, `claude-cli`,
`mcp-server`, `developer-tools`, `ai-coding`, `coding-agent`, `personal-marketplace`,
`windows-plugin`, `safe-mode`

## Contributing

Ideas, bug reports, and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[SECURITY.md](SECURITY.md).
