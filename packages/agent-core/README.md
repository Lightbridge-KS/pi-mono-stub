# @pi-mono-stub/agent-core

Stub of the `pi-agent-core` runtime package from
[pi-mono](https://github.com/badlogic/pi-mono). Provides the stateful
`Agent` orchestrator with a swappable `streamFn` transport, before/after
tool-call hooks, and a message-injection protocol (`steer`, `followUp`).

See `_docs/pi-mono-oop-uml-architecture.md` §6 for why composition was
chosen over inheritance for the Agent runtime.

## Try it

```bash
pnpm install
pnpm --filter @pi-mono-stub/agent-core example
```
