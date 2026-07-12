# Claude Code Codex Plugin

A security-focused Codex plugin for using an authenticated local Claude Code CLI. It provides local
status and login tools plus safe, constrained Claude Code prompts from within Codex.

## Install

Clone this repository, then run the Windows installer from the plugin directory:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\claude-code\install.ps1
```

The installer copies the plugin to the recipient's profile, writes machine-specific MCP paths, and
adds it to their Personal marketplace. Start a new Codex task after installation.

Each user authenticates their own Claude account through `claude_code_login`. No credentials are
stored in this repository or copied by the installer.

## Security Model

- Claude Code runs through a signed local executable.
- MCP requests are size-limited and execute one at a time.
- Prompts run in the current Codex task workspace with Claude safe mode enabled.
- Autonomous permission modes are not exposed through the MCP server.
- Child process output is capped and timed-out process trees are terminated.

## Contributing

Ideas, bug reports, and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[SECURITY.md](SECURITY.md).
