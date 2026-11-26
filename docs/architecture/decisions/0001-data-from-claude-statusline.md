# 1. Get usage data from claude-statusline

- Status: Accepted
- Date: 2026-11-26

## History

- 2026-11-26: Proposed
- 2026-11-26: Accepted
- 2026-11-26: claude-statusline v0.16.0 released with rate-bars --data

## Context

Herdr should show Claude Code's 5h and 7d usage bars. Other mods do this
already (nozikov/herdr-usage-limits, dev-gvs/herdr-claude-usage,
oszypczy/herdr-claude-usage). They fetch and compute usage themselves, so
their pace and thresholds can differ from the terminal status line.

## Decision

Run `claude-statusline rate-bars --data` and draw what it returns. The
mod computes nothing. `used`, `target` and `state` come from claude-statusline.

The output is one JSON line on stdout, and the command exits 0:

```json
{"rate5h":{"ok":true,"used":75,"target":50,"state":"warn","resets_at":1760009000},
 "rate7d":{"ok":false}}
```

## Consequences

- Herdr matches the terminal status line exactly: same pace, thresholds, state.
- No network calls or credentials. The command reads claude-statusline's
  cache (`<state dir>/cache/ratelimits`) and never writes it.
- The mod needs claude-statusline installed, at a version with `--data`.
  That's unreleased as of this date (PaddleHQ/claude-statusline PR #90).
