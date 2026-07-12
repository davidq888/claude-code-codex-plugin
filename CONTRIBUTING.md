# Contributing

Open an issue for bugs, improvement ideas, documentation gaps, or compatibility reports. For code
changes, describe the problem first and keep pull requests narrowly focused.

Before opening a pull request:

1. Run the plugin validator.
2. Run `node --check` on `plugins/claude-code/scripts/claude-code-mcp.js`.
3. Do not add credentials, authentication tokens, or machine-specific paths to committed files.
4. Explain any security impact in the pull request description.

Changes that expand process execution, permission modes, or filesystem access need a security review.
