# DeepSeek Harness — Skills & Prompts UI

A command-palette **skills browser** for the DeepSeek Harness (DSH) web GUI.

## What it does

- A **Skills** button in the sidebar footer and **Ctrl/Cmd+K** anywhere open a palette.
- The palette lists every skill currently loaded in DSH (name + one-line description) and filters live as you type.
- Selecting a skill shows its full instructions body (name, description, when-to-use, rendered markdown) with a back button.
- Esc or clicking outside closes it. Light and dark themes via DSH alias tokens.

## Package layout

| Path | Purpose |
| --- | --- |
| `lib/client.js` | Browser half (self-contained bundle): palette UI, registers into `sidebar.footer.action` + `shell.overlay`. |
| `lib/index.js` | Node half: exists so the package appears in the host loader; serves the skill catalog + bodies over the package-private RPC channel when available. |
| `src/filter.js` | Pure search filter (tested). |
| `src/summary.js` | Pure skill-summary shaping (tested). |
| `test/` | `node:test` unit tests (seams S1/S2). |
| `prototype/ticket1/` | The validated dynamic-plugin prototype this package was ported from. |

## Develop

```sh
npm test        # node:test — 11 tests
```

## Install (wire into the web profile)

1. Make the package resolvable from the web profile:

   ```sh
   dsh plugin --profile web add <this-dir>
   # or, without the CLI: junction <this-dir> into ~/.dsh/profiles/node_modules/@jamiebarker/dsh-client-ui-skills-palette
   ```

2. Add a row to `~/.dsh/profiles/web/cordis.patch.yml`:

   ```yaml
   - insert:
       - id: ui-skills-palette
         name: '@jamiebarker/dsh-client-ui-skills-palette'
   ```

3. Restart (or let HMR recompose) the web profile, then refresh the page.

## Tickets

Tracked in GitHub Issues on `jamesbarker185/deepseek-harness-skill-ui` (#1–#5). See `docs/agents/issue-tracker.md`.
