# Architecture decision records

One file per decision: `NNNN-short-title.md`, numbered in order.

- An ADR is never rewritten once accepted. To change a decision, write a new
  ADR and set the old one's status to `Superseded by NNNN`.
- Statuses: `Proposed`, `Accepted`, `Rejected`, `Superseded by NNNN`.
- `Date` is when the ADR was written. Each status change adds a dated line
  to its `History`, and updates the `Updated` column below.
- `../overview.md` describes the design as it stands now and links here.

| # | Decision | Status | Written | Updated |
|---|----------|--------|---------|---------|
| [0001](0001-data-from-claude-statusline.md) | Get usage data from claude-statusline | Accepted | 2026-11-26 | 2026-11-26 |
| [0002](0002-separate-block-beside-stock-bar.md) | Separate block beside the stock status bar | Accepted | 2026-11-26 | 2026-11-26 |
| [0003](0003-binary-lookup.md) | How the mod finds the claude-statusline binary | Accepted | 2026-11-26 | 2026-11-26 |
| [0004](0004-state-colours.md) | Colours for good, warn and bad | Accepted | 2026-11-26 | 2026-11-26 |

## Template

```markdown
# N. Title

- Status: Proposed
- Date: YYYY-MM-DD

## History

- YYYY-MM-DD: Proposed

## Context

What forces the decision. Facts, with sources.

## Decision

What we do.

## Consequences

What gets easier, what gets harder, what to watch.
```
