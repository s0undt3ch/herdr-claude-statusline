# claude-statusline Herdr mod Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Herdr mod, `mods/claude-statusline/`, that draws Claude Code's 5h and 7d usage bars in a block beside Herdr's stock status bar.

**Architecture:** `core.js` is pure JS with no Herdr imports: it parses `rate-bars --data`, works out the binary candidates and state dir, and turns a reading into a bar model (widths, colour, tooltip). It's unit-tested with `node --test`. `main.js` is the GPUI `View`: it resolves the binary, runs it, watches the cache folder, and renders the models.

**Tech Stack:** Herdr app mods (gpui-kit JS, `herdr` module), Node 26 `node:test` for `core.js` only.

**Spec:** `docs/architecture/overview.md` and ADRs 0001–0004 in `docs/architecture/decisions/`.

## Global Constraints

- Data comes only from `claude-statusline rate-bars --data` (ADR 0001). The mod never computes pace or state.
- Placement: a fixed-px block beside `workspace-status`, in a cloned layout (ADR 0002). Starting width 260px.
- Binary lookup order (ADR 0003): `binary` prop → `$C/plugins/data/statusline-claude-statusline/bin/claude-statusline` → `$C/claude-statusline/claude-statusline` → `claude-statusline` on `PATH`, where `$C` = `CLAUDE_CONFIG_DIR`, default `~/.claude`.
- State dir: `$C/plugins/data/statusline-claude-statusline` when the binary lives under it, else `$C/claude-statusline`. Watch `<state dir>/cache`.
- Colours (ADR 0004): `good`→`t.done`, `warn`→`t.ansi3`, `bad`→`t.blocked`, no reading or error→dimmed empty track, no marker.
- Look matches `workspace-status`: `t.chrome` background, `border_t(1)` `t.border`, `text_size(11.8)`, `t.muted` labels.
- Mod rules (`~/.config/herdr-app/AGENTS.md`): never keep a `cx`; no `setTimeout`; use `cx.timer.every`; guard `exec` in `init` with `checking()`.
- `core.js` must not import `herdr` or `gpui-kit`, so Node can load it.
- Tests run with `TZ=UTC` so time formatting is deterministic.

## Review Focus

1. `used` or `target` above 100 or below 0 → widths clamp to 0–100%, the tooltip shows the real number. (Task 1 test `clamps out-of-range percentages`.)
2. A claude-statusline without `--data` (exits 2) or any non-zero exit → dim bars, tooltip `claude-statusline failed (exit 2): <first stderr line>`. (Task 3 test `describes a failed run`.)
3. Output with a trailing newline or a second line → parse the first non-empty line only. (Task 1 test `parses only the first line`.)
4. The binary vanishes after startup (plugin update) → the next refresh resolves again instead of failing forever. (Task 4 step, checked live.)
5. `resets_at` already in the past while `ok:true` → the tooltip says `resets now`, not a negative time. (Task 1 test `past reset says now`.)

---

### Task 1: Parse the data and build bar models

**Files:**
- Create: `package.json` (`{"private": true, "type": "module", "scripts": {"test": "TZ=UTC node --test tests/"}}`)
- Create: `mods/claude-statusline/core.js`
- Test: `tests/core.test.js`

**Interfaces:**
- Produces:
  - `parseData(stdout: string) -> { rate5h: Rate, rate7d: Rate }`, where `Rate = { ok: false } | { ok: true, used: number, target: number, state: "good"|"warn"|"bad", resets_at: number }`. Throws `Error("unexpected output: <first 80 chars>")` on non-JSON or a missing `rate5h`/`rate7d`.
  - `barModel(label: "5h"|"7d", rate: Rate | null, t: Record<string,string>, nowSec: number, error?: string) -> { fill: number, marker: number | null, colour: string, dim: boolean, tooltip: string }`. `fill` and `marker` are clamped percentages.
  - `formatReset(resetsAt: number, nowSec: number) -> string`: `"now"` if past, `"HH:MM"` if under 24h away, else `"Ddd HH:MM"` (`Sun`…`Sat`), local time, built with `Date` getters, not `Intl`.

- [ ] **Step 1: Write the failing tests** in `tests/core.test.js` (`node:test` + `node:assert/strict`). `t = { done: "D", ansi3: "Y", blocked: "B", dim: "M" }`. `now = 1764158400` (2025-11-26 12:00 UTC).
  - `parses a full reading`: `parseData('{"rate5h":{"ok":true,"used":75,"target":50,"state":"warn","resets_at":1760009000},"rate7d":{"ok":false}}')` deep-equals the same object.
  - `parses only the first line`: the same JSON + `"\n\n"` and + `"\nnoise"` both parse.
  - `rejects junk`: `parseData("Usage: …")` throws `/unexpected output/`; `parseData('{"rate5h":{"ok":false}}')` throws.
  - `maps state to colour`: `barModel("5h", {ok:true,used:8,target:54,state:"bad",resets_at:now+3600}, t, now)` → `{fill: 8, marker: 54, colour: "B", dim: false}`. Also `good`→`"D"`, `warn`→`"Y"`.
  - `clamps out-of-range percentages`: `used:130,target:-5` → `fill: 100, marker: 0`, tooltip contains `130%`.
  - `no reading is dim`: `barModel("7d", {ok:false}, t, now)` → `{fill: 0, marker: null, dim: true}`, tooltip `"7d: no reading"`.
  - `error is dim with reason`: `barModel("5h", null, t, now, "boom")` → `dim: true`, tooltip `"5h: boom"`.
  - `tooltip text`: the first case's tooltip is exactly `"5h: 8% used, pace 54%, resets 13:00"`.
  - `past reset says now`: `formatReset(now - 10, now) === "now"`.
  - `far reset shows weekday`: `formatReset(now + 3*86400, now) === "Sat 12:00"`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test`
Expected: FAIL, `Cannot find module …/core.js` or missing exports.

- [ ] **Step 3: Implement `parseData`, `barModel`, `formatReset` in `mods/claude-statusline/core.js`**

`barModel` with `dim: true` uses `t.dim` as `colour`.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add package.json mods/claude-statusline/core.js tests/core.test.js
git commit -m "feat: parse rate-bars data into bar models"
```

### Task 1b: Repo tooling (mise, prek, pre-commit)

Added mid-run at the user's request.

**Files:**
- Create: `mise.toml`: `[tools]` pins `node = "26.13.1"`, `prek = "0.5.11"`, `biome = "2.6.9"`. `[tasks.test]` runs `npm test`. `[tasks.check]` runs `herdr-app check mods/claude-statusline`.
- Create: `.pre-commit-config.yaml`, prek-compatible:
  - `pre-commit/pre-commit-hooks`: `trailing-whitespace`, `end-of-file-fixer`, `check-json`, `check-yaml`, `check-merge-conflict`, `check-added-large-files`
  - local `biome check --write` on `*.js`/`*.json` (`language: system`)
  - local `node-test`: `npm test` (`pass_filenames: false`, files `\.js$`)
  - local `herdr-check`: `sh -c 'command -v herdr-app >/dev/null || exit 0; herdr-app check mods/claude-statusline'` (`pass_filenames: false`, files `^mods/`)
- Create: `biome.json`: format and lint `mods/` and `tests/`, 2-space indent, double quotes (match `workspace-status`).
- Modify: existing JS only as `biome check --write` reformats it.

**Interfaces:**
- Produces: `mise run test`, `mise run check`; hooks installed with `prek install`.

- [ ] **Step 1:** Write the three files. Run `mise install`, then `prek install`.
- [ ] **Step 2: Verify** with `prek run --all-files`. Expected: every hook passes. `herdr-check` passes or skips.
- [ ] **Step 3: Commit** `chore: add mise, prek and biome tooling` (through the hooks).

### Task 2: Binary candidates and state dir

**Files:**
- Modify: `mods/claude-statusline/core.js`
- Test: `tests/core.test.js`

**Interfaces:**
- Produces:
  - `candidates(propBinary: string | undefined, configDir: string) -> string[]`: the ADR 0003 order. The bare name `"claude-statusline"` is last. A missing or empty prop is skipped.
  - `stateDir(binary: string, configDir: string) -> string`: the plugin data dir if `binary` starts with `<configDir>/plugins/data/statusline-claude-statusline/`, else `<configDir>/claude-statusline`.
  - `configDirFrom(envValue: string, home: string) -> string`: `envValue` trimmed if non-empty, else `<home>/.claude`. A trailing `/` is removed.

- [ ] **Step 1: Write the failing tests**
  - `candidates order`: `candidates(undefined, "/h/.claude-work")` deep-equals `["/h/.claude-work/plugins/data/statusline-claude-statusline/bin/claude-statusline", "/h/.claude-work/claude-statusline/claude-statusline", "claude-statusline"]`; with `"/opt/cs"` it comes first; with `""` it's skipped.
  - `state dir for plugin binary` → `/h/.c/plugins/data/statusline-claude-statusline`.
  - `state dir otherwise`: for `/h/.c/claude-statusline/claude-statusline` and `/usr/local/bin/claude-statusline` → `/h/.c/claude-statusline`.
  - `config dir default`: `configDirFrom("", "/h") === "/h/.claude"`; `configDirFrom("/h/.claude-work/\n", "/h") === "/h/.claude-work"`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test` → FAIL on the new tests only.

- [ ] **Step 3: Implement `candidates`, `stateDir`, `configDirFrom` in `core.js`**

- [ ] **Step 4: Run the tests**

Run: `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add mods/claude-statusline/core.js tests/core.test.js
git commit -m "feat: resolve claude-statusline binary candidates and state dir"
```

### Task 3: The view, drawing fixed data

**Files:**
- Create: `mods/claude-statusline/main.js`
- Create: `mods/claude-statusline/mod.json` (`{ "place": "none" }`)
- Modify: `mods/claude-statusline/core.js` (add `describeFailure`)
- Test: `tests/core.test.js`

**Interfaces:**
- Consumes: `barModel` (Task 1).
- Produces:
  - `export default class ClaudeStatusline extends View` with fields `this.data: {rate5h, rate7d} | null` and `this.error: string | null`. `render()` draws from these two fields only.
  - `describeFailure(result: {code:number, stderr:string}) -> string`: `"claude-statusline failed (exit N): <first non-empty stderr line>"`, or without the `: …` part when stderr is empty.

- [ ] **Step 1: Write the failing test** `describes a failed run`: `describeFailure({code: 2, stderr: "\n--data takes no other flags\nmore"})` → `"claude-statusline failed (exit 2): --data takes no other flags"`; `{code: 1, stderr: ""}` → `"claude-statusline failed (exit 1)"`.

- [ ] **Step 2: Run it to confirm it fails.** `npm test` → FAIL.

- [ ] **Step 3: Implement `describeFailure`, then `main.js`**

`render()`: `h_flex().size_full().px(14).gap(12).items_center().justify_end()` with the global-constraint chrome styles. Then, for each of `5h` and `7d`, a label plus a bar. Bar: `div().id(label).relative().w(80).h(6).rounded(3).bg(t.border).tooltip(m.tooltip)`, a fill child `w(\`${m.fill}%\`)` in `m.colour`, and, when `m.marker !== null`, an `h_flex().absolute().inset_0()` overlay with a spacer `w(\`${m.marker}%\`)` and a `w(2).h_full().bg(t.foreground)` line. For now, `init` sets `this.data` to the sample reading from Task 1's `tooltip text` test. Task 4 replaces it.

- [ ] **Step 4: Validate**

Run: `npm test && cp -R mods/claude-statusline ~/.config/herdr-app/mods/ && herdr-app check ~/.config/herdr-app/mods/claude-statusline`
Expected: tests pass, check reports no errors.

- [ ] **Step 5: Commit**

```bash
git add mods/claude-statusline tests/core.test.js
git commit -m "feat: draw usage bars from a fixed reading"
```

### Task 4: Live data, refresh, and the cloned layout

**Files:**
- Modify: `mods/claude-statusline/main.js`

**Interfaces:**
- Consumes: `candidates`, `stateDir`, `configDirFrom`, `parseData`, `describeFailure` (Tasks 1–3); `exec`, `home`, `props`, `checking`, `watchFolder` from `herdr`.
- Produces: `async refresh()` on the view, which sets `this.data` or `this.error`.

- [ ] **Step 1: Implement `resolve()`**: `configDirFrom((await exec("sh", ["-c", 'printf %s "$CLAUDE_CONFIG_DIR"'])).stdout, home())`. Then the first candidate where `exec("test", ["-x", c])` exits 0. For the bare name, use `exec("sh", ["-c", "command -v claude-statusline"])`. Cache the result in `this.binary`. No binary gives `this.error = "claude-statusline not found"`.

- [ ] **Step 2: Implement `refresh()`**: run `exec(this.binary, ["rate-bars", "--data"], { timeout: 5000 })`. Exit 0 goes through `parseData`. Non-zero gives `describeFailure`. A rejection or a parse error sets `this.error` and clears `this.binary`, so the next refresh resolves again (Review Focus 4).

- [ ] **Step 3: Wire `init(props, cx)`**: if `checking()`, keep the Task 3 sample and return. Otherwise `cx.spawn` one async loop: resolve, refresh, `cx.notify()`. Then forever: `await watchFolder(stateDir(...) + "/cache")`, refresh, notify. Wrap each iteration in try/catch so a failed watch on a missing folder falls through. Add `cx.timer.every(60000, cx => { this.refresh().then(() => cx.notify()) })` (adjust to the real `AsyncContext` API in `gpui-kit.d.ts:20673`). Remove the fixed sample from the non-check path.

- [ ] **Step 4: Validate the check still passes**

Run: `cp -R mods/claude-statusline ~/.config/herdr-app/mods/ && herdr-app check ~/.config/herdr-app/mods/claude-statusline`
Expected: no errors.

- [ ] **Step 5: Install in a cloned layout and verify live**

Run `herdr-app do layout.clone '{"name":"main","as":"main-usage"}'`. Replace `status` in `~/.config/herdr-app/layouts/main-usage.json` with the ADR 0002 row. Then confirm:
- `layouts/layout.error` is absent.
- The bars show 5h and 7d. Fill and marker match `~/.claude-work/claude-statusline/claude-statusline rate-bars --data`.
- The hover tooltip reads like `5h: 8% used, pace 54%, resets HH:MM`.
- Renaming the binary temporarily makes the bars dim within 60s, with `claude-statusline not found`. Restoring it brings them back.
- Record whether `CLAUDE_CONFIG_DIR` came through `exec` (expected `/Users/…/.claude-work`). If it didn't, stop and amend ADR 0003 with a new ADR.

- [ ] **Step 6: Commit**

```bash
git add mods/claude-statusline/main.js
git commit -m "feat: run claude-statusline and refresh on cache changes"
```

### Task 5: Publishing files

**Files:**
- Create: `RECIPE.md` (sections: what you see, how it behaves, built from, watch out, done when; per Herdr `AGENTS.md` "Layouts and mods other people made")
- Create: `README.md` (what it is, needs claude-statusline with `rate-bars --data`, install: copy `mods/claude-statusline`, clone a layout, paste the ADR 0002 row, optional `binary` prop)
- Create: `preview.png` (screenshot of the live bottom bar from Task 4)

- [ ] **Step 1: Write `RECIPE.md` and `README.md`** from the overview and ADRs. "Watch out" covers: under-pace shows red (ADR 0004); the `ok:false` flip at reset; binary lookup order.
- [ ] **Step 2: Capture `preview.png`** of the bottom bar with the bars visible.
- [ ] **Step 3: Verify** `ls mods/claude-statusline/{main.js,core.js,mod.json} RECIPE.md preview.png` lists all five files.
- [ ] **Step 4: Commit**

```bash
git add RECIPE.md README.md preview.png
git commit -m "docs: add recipe, readme and preview for herdr.dev"
```
