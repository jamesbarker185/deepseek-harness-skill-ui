# DeepSeek Harness (DSH) — Exploratory Capabilities Write-up

*Scope: capabilities of DeepSeek Harness (DSH), the tool whose Web GUI runs at
http://127.0.0.1:3080. Everything here was verified by inspecting the installed
packages, the live web profile's composed plugin tree (135 rows), the DSH home
directory, the CLI surface, and the project's official sources — not from
marketing copy.*

---

## 1. What it is

**DeepSeek Harness** is DeepSeek's open-source (MIT) agent framework —
[GitHub: deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) —
described officially as ["Everything is a Plugin"](https://www.deepseek.com/harness/en/).
It is in developer preview: this install is `dsh` v0.1.0-rc.8 (npm global package
`@deepseek-ai/dsh`).

The core idea: **every capability — model adapters, tools, persistence,
permissions, even UI panels — is a plugin row in a dependency-injection
container (Cordis)**, composed per-"profile" as ordered layers you can override
with your own config (patch files) and extend with your own plugins.

```
dsh (launcher)
 └─ boots a "profile" = ordered stack of plugin-bundle patch layers
     ├─ @deepseek-ai/dsh-base      (core: models, tools, sessions, policy…)
     ├─ @deepseek-ai/dsh-web-app   (the browser UI, web server, client plugins)
     └─ your overrides: profile/cordis.patch.yml → ~/.dsh/cordis.patch.yml → --patch
```

On this machine: `DSH_HOME = C:\Users\jamie.barker\.dsh` with one initialized
profile (`web`), whose composed tree contains **135 plugin rows**
(`dsh --profile web --dump-default-config`).

## 2. Entry points (how you run it)

| Command | What it does |
|---|---|
| `dsh web` | Boot the browser GUI. Flags: `--host`, `--port`, `--no-open`, `--trusted-host` |
| `dsh --profile headless "task"` | One-shot: fresh persisted session, run the task, print the final answer, exit — no server, scriptable |
| `dsh --profile <name> --resume <session>` | Boot a custom profile (a terminal/TUI profile exists as a bundle) |
| `dsh plugin --profile <name> add <pkg>` | Install plugins into a profile (forwards to pnpm in the profile dir) |
| `dsh --dump-config` / `--dump-default-config` | Print the composed plugin tree without booting |

## 3. The agent core (what a session can do)

- **Model routing** — defaults to DeepSeek (`deepseek-v4-flash` via
  `deepseek-official`), plus a pi-ai route and installed adapters for
  **Anthropic Claude, AWS Bedrock, Mistral, Google GenAI**. GUI model-selection
  panel, bounded retries (5 by default), token meter.
- **Sandboxed shell** — PowerShell on Windows / bash on POSIX, with permission
  presets `read-only` / `workspace-write` / `danger-full-access`, an approval
  service, and (on Windows) an ACL restricted-token runner. (This session's
  settings default to `danger-full-access`, approval: never.)
- **File tools** — read / write / edit (string-replace), glob, grep, file
  references, observation policy (read before edit), atomic writes, spill of
  large outputs to files.
- **Web search** — DeepSeek-powered search using `DEEPSEEK_API_KEY` (optional
  fetch tool).
- **Background jobs** — long-running commands you can query/kill while the agent
  keeps working.
- **Subagents** — spawn and fork providers; continuable background agents with
  their own sessions, plus list / interrupt / report control.
- **Workflows** — scripted multi-agent orchestration (phases, pipelines,
  parallel barriers, JSON-schema-validated results).
- **Ralph loops** — fresh-agent iterative execution sharing a durable workspace.
- **Goals** — persisted same-session objectives with automatic continuation
  rounds, pause / resume / edit / blocked states, round limits.
- **Plan mode** — plan-first, approval-gated implementation workflow.
- **Task tracking** — todo list tool with parallel-in-progress support.
- **MCP client** — connect external [Model Context Protocol](https://modelcontextprotocol.io/)
  servers (stdio or streamable-http); their tools appear natively as
  `mcp__<server>__<tool>` with auto-reconnect and backoff.
- **Compaction & context management** — basic compaction, tool-result pruning,
  `command-compact`, session checkpoints, cross-session references, time context.
- **Sessions** — persisted per-workspace as JSONL under `~/.dsh/sessions`,
  SQLite query store, projection cache, auto-titles, log export, stats.

## 4. Skills (the pluggable knowledge layer)

Skills are `SKILL.md` bundles (or flat `.md` files) with YAML frontmatter
(`name`, `description`, `whenToUse`, invocation policy). Auto-discovered from,
in rank order:

1. `<project>/.dsh/skills`
2. `<project>/.agents/skills`
3. custom dirs (`customSkillDirs`)
4. `~/.dsh/skills`
5. `~/.agents/skills`

They are watched and hot-reloaded, and can be invoked by the model or by the
user. The harness ships bundled skills (e.g. `cordis-plugin-development`, which
teaches the agent to write dynamic plugins at runtime); a session catalog can
carry purpose-built skill sets (this session shows Clerk auth skills and the
HyperFrames video suite).

## 5. Agent presets (personas)

Shipped in `config/agent-presets/` (default: `standard`):

- **standard** — full coding agent: file editing, shell, file & web search,
  skills, plan, goals, subagents, workflows
- **code (PTC)** — everything in standard, but tools are exposed through a Code
  Mode SDK: the model writes one TypeScript program to compose multi-step
  operations
- **minimal** — just persistent bash + `str_replace_editor`
- **cordis (creator)** — for building your own presets and plugins, with runtime
  inspection

## 6. The Web UI

The `dsh-web-app` bundle mounts a full client-plugin roster: conversation view,
sidebar, theme & locale, model selection, **permission switcher**, plan view,
goal view, jobs view, subagent view, skills view, settings (general / models /
plugins / plugin inventory), deliverables, workspace, trajectory, user
questions, message feedback, attachments, references, workflow-run view.
Client plugins hot-reload (HMR) during development.

## 7. Extensibility (the headline feature)

- **Install plugins**: `dsh plugin --profile web add <package>` (curated list:
  [awesome-dsh-plugin](https://github.com/Anil-matcha/awesome-dsh-plugin))
- **Patch anything**: a profile's `cordis.patch.yml` (or `--patch file.yml`)
  overrides any plugin row's config by id — no fork needed
- **Write your own**: dynamic Cordis plugins (host services, client UI slots,
  new tools) can be developed and hot-loaded at runtime; bundled skills and the
  "creator" preset guide this
- **Your own skills/prompts**: drop `SKILL.md` bundles into a project's
  `.dsh/skills` and they become agent capabilities

## 8. State of this machine right now

- DSH v0.1.0-rc.8 (developer preview); web profile running at `127.0.0.1:3080`
- `~/.dsh`: profiles (`web`), sessions (JSONL for two workspaces), storages,
  settings, credentials
- Project folder `ui-for-skills-and-prompts` is **empty** — nothing to work on
  yet; the name hints at building a UI around skills & prompts, which this
  framework is tailor-made for (skills layer + web frontend + plugin UI slots
  are all first-class)

## Sources

- [GitHub: deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- [DeepSeek Harness developer preview — "Everything is a Plugin"](https://www.deepseek.com/harness/en/)
- [SitePoint: DeepSeek Harness developer-preview review](https://www.sitepoint.com/deepseek-harness-developer-preview/#1)
- [awesome-dsh-plugin: curated plugin list](https://github.com/Anil-matcha/awesome-dsh-plugin)
