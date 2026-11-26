# Architecture overview

The design as it stands now. Update this file whenever it changes. The
reasons behind each choice live in [decisions/](decisions/README.md).

## Intent

Show Claude Code's 5h and 7d usage bars in Herdr's bottom bar, drawn
natively (GPUI boxes, 2px pace marker). The numbers come from
claude-statusline ([ADR 0001](decisions/0001-data-from-claude-statusline.md)),
so Herdr matches the terminal status line exactly.

## Goals

- A small mod, `mods/claude-statusline/`, that draws two bars and nothing else.
- Publishable on herdr.dev/mods: `RECIPE.md`, `preview.png`, repo topic `herdr-mod`.

## Non-goals and anti-goals

- Deciding pace, thresholds or state. claude-statusline decides; the mod draws.
- Copying Herdr's `workspace-status` bar
  ([ADR 0002](decisions/0002-separate-block-beside-stock-bar.md)).

## Design

- **Placement:** a fixed-width block beside the stock bar, in a cloned
  layout ([ADR 0002](decisions/0002-separate-block-beside-stock-bar.md)).
- **Look:** `5h [bar] 7d [bar]`, styled to match `workspace-status`
  (`t.chrome` background, `border_t(1)` in `t.border`, 11.8 text in
  `t.muted`). Each bar is a track (`t.border`), a fill at `used%`, and a 2px
  marker at `target%` drawn with an absolute overlay row (spacer
  `w(target%)` + `w(2)` line).
- **Colours:** [ADR 0004](decisions/0004-state-colours.md).
- **Tooltip:** `.tooltip()` on each bar with usage and reset time, e.g.
  "5h: 8% used, resets 18:30". On error, the reason.
- **Binary:** [ADR 0003](decisions/0003-binary-lookup.md).
- **Refresh:** run `rate-bars --data` on init. Then loop `watchFolder` on the
  state dir's `cache/` inside `cx.spawn`, plus a 60s `cx.timer.every`
  fallback, because `ok` flips to false at reset without a cache write.
  Guard side effects with `checking()`.

## Open for the builder

- Whether `exec` sees `CLAUDE_CONFIG_DIR` (see ADR 0003).
- The theme's ansi yellow name.
- Block width (260px is a guess) and the `preview.png` capture.
- Validate with `herdr-app check`, then live in a cloned layout.
