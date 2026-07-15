# Outreach Drafts

Use these drafts when sharing Claude Code Codex Plugin with communities that discuss Codex, Claude Code, MCP, and developer tooling. Keep posts conversational, avoid cross-posting too quickly, and adjust the opening sentence to match each community's norms.

## Short Description

Claude Code Codex Plugin lets Codex call your local Claude Code CLI through MCP for login checks, status checks, safe-mode prompts, reviews, and second-opinion coding help without storing Claude credentials.

## OpenAI Community

Title:

```text
Claude Code Codex Plugin: use local Claude Code from Codex through MCP
```

Body:

```text
I made a small open source Codex plugin for people who use both Codex and Claude Code.

It connects Codex to your local Claude Code CLI through MCP, so Codex can ask Claude Code for reviews, second opinions, implementation checks, or help on coding tasks while keeping credentials handled by the Claude CLI itself.

Repo:
https://github.com/davidq888/claude-code-codex-plugin

Highlights:
- no Claude credential storage in the plugin
- login and status checks
- safe-mode prompts
- Windows/macOS/Linux command resolution
- scanner metadata included
- listed in Awesome Codex Plugins

I would appreciate feedback, security review, and improvement ideas from other Codex/plugin users.
```

## Reddit r/codex

Title:

```text
I made an open-source Codex plugin for using local Claude Code through MCP
```

Body:

```text
Sharing a small tool for people who use both Codex and Claude Code:

https://github.com/davidq888/claude-code-codex-plugin

It lets Codex call your local Claude Code CLI through MCP for status checks, reviews, second opinions, and safe-mode prompts. The plugin does not store Claude credentials; auth stays with the official Claude Code CLI.

I spent most of the work on safety details: strict executable resolution, bounded timeouts, no credential persistence, scanner metadata, and a passing HOL plugin scanner run.

It is now also listed in Awesome Codex Plugins:
https://github.com/hashgraph-online/awesome-codex-plugins

Feedback, security review, and PRs are welcome.
```

## Discord

```text
I released a small open-source Codex plugin for people using both Codex and Claude Code:
https://github.com/davidq888/claude-code-codex-plugin

It connects Codex to the local Claude Code CLI through MCP for login/status checks, reviews, second opinions, and safe-mode prompts. It does not store Claude credentials; auth stays with Claude Code.

Happy to get feedback or security review if anyone here uses both tools.
```

## GitHub Discussion Follow-Up

```text
Quick update: the plugin is now listed in Awesome Codex Plugins as well:
https://github.com/hashgraph-online/awesome-codex-plugins

The repo has scanner metadata and a passing HOL Plugin Scanner run:
https://github.com/davidq888/claude-code-codex-plugin/actions/runs/29210476917
```
