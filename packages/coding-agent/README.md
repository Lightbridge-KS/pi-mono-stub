# @pi-mono-stub/coding-agent

Stub of the `pi-coding-agent` application-shell package from
[pi-mono](https://github.com/badlogic/pi-mono) — the top-level CLI
(`pi`) that wires `pi-ai`, `pi-tui`, and `pi-agent-core` into a
complete interactive coding assistant with session persistence,
extensions, and three run modes (Interactive / Print / RPC).

See `_docs/pi-mono-oop-uml-architecture.md` §7 for the design of
`AgentSession` as a Facade and the three-mode strategy.

## Try it

```bash
pnpm install
pnpm --filter @pi-mono-stub/coding-agent example            # --print mode
pnpm --filter @pi-mono-stub/coding-agent example:interactive
pnpm --filter @pi-mono-stub/coding-agent example:rpc
```
