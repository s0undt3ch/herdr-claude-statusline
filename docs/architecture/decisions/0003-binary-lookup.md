# 3. How the mod finds the claude-statusline binary

- Status: Accepted
- Date: 2026-11-26

## History

- 2026-11-26: Proposed
- 2026-11-26: Accepted

## Context

claude-statusline is installed one of two ways: as a Claude Code plugin
(binary in the plugin data dir), or by hand. It's often not on `PATH`.
Layout blocks can pass `props` to a mod. It's not yet checked whether Herdr's
`exec` sees `CLAUDE_CONFIG_DIR`.

## Decision

Try these in order, first hit wins (`CLAUDE_CONFIG_DIR` defaults to `~/.claude`):

1. a `binary` prop on the block
2. `$CLAUDE_CONFIG_DIR/plugins/data/statusline-claude-statusline/bin/claude-statusline`
3. `$CLAUDE_CONFIG_DIR/claude-statusline/claude-statusline`
4. `claude-statusline` on `PATH`

Watch the `cache/` folder in the state dir that belongs to the winning
binary. That's the plugin data dir for 2, and the binary's folder for 3.

## Consequences

- Works with no config for both install types.
- People with an unusual setup set one prop.
- If `exec` doesn't see `CLAUDE_CONFIG_DIR`, steps 2 and 3 need another way
  to find it. Revisit this ADR then.
