# 2. Separate block beside the stock status bar

- Status: Accepted
- Date: 2026-11-26

## History

- 2026-11-26: Proposed
- 2026-11-26: Accepted

## Context

Herdr's bottom bar is the shipped mod `workspace-status`, a 28px `block` in
`layouts/main.json`. Shipped mods and layouts are read-only and get replaced
on start. A mod can't change another mod at run time. Every option needs a
cloned layout.

Options:

1. Patch the shipped bar in place. Impossible, for the reasons above.
2. Full replacement: copy `workspace-status` and add the bars. The copy
   stops getting Herdr's updates and drifts.
3. Separate block: turn `status` into a `row` with the stock mod and ours
   side by side. `work-body` in `main.json` already nests a row in a column.

## Decision

Option 3. In a cloned layout, replace the `status` block with:

```json
{ "id": "status", "type": "row", "size": { "px": 28 }, "children": [
  { "id": "status-main", "type": "block", "content": { "mod": "workspace-status" } },
  { "id": "status-usage", "type": "block", "size": { "px": 260 },
    "content": { "mod": "claude-statusline" } } ] }
```

## Consequences

- Herdr keeps updating its own bar. The mod stays small.
- The bars sit at the far right, after the palette hint. They can't go
  between Herdr's items without option 2.
- Our block has to copy the stock bar's look (`t.chrome`, top border) to
  read as one bar. If Herdr restyles its bar, ours may stop matching.
