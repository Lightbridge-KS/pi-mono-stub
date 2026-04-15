# @pi-mono-stub/tui

Stub of the `pi-tui` foundation package from
[pi-mono](https://github.com/badlogic/pi-mono). Component-based terminal
UI with `Container` composite, `Focusable` mixin, and a `TUI`
orchestrator that owns a `Terminal` and a `KeybindingsManager`.

See `_docs/pi-mono-oop-uml-architecture.md` §5 for the design rationale
(dependency-injected themes, Composite pattern, function-valued render).

## Try it

```bash
pnpm install
pnpm --filter @pi-mono-stub/tui example
```
