# 4. Colours for good, warn and bad

- Status: Accepted
- Date: 2026-11-26

## History

- 2026-11-26: Proposed
- 2026-11-26: Accepted

## Context

`state` is `good`, `warn` or `bad`. Being far under pace is also `bad`, the
same as in the terminal. Colours must follow Herdr's theme, so they come from
`theme()` names, not hex.

## Decision

- `good` → `t.done`
- `warn` → the theme's ansi yellow
- `bad` → `t.blocked`
- no reading (`ok:false`) or an error → dimmed empty track, no marker

Under-pace uses the same colour as over-pace.

## Consequences

- Herdr says the same thing as the terminal.
- Light usage early in a window paints the bar red, which reads as an
  alarm. If that turns out to be noise, under-pace needs its own colour, and
  the data contract would have to say which way the deviation goes.
