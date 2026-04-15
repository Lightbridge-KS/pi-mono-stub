# @pi-mono-stub/ai

Stub of the `pi-ai` foundation package from
[pi-mono](https://github.com/badlogic/pi-mono). Mirrors the real
`packages/ai/src/` layout so you can compare stub-vs-real file by file.

See `_docs/pi-mono-oop-uml-architecture.md` §4 for the reasoning behind
the shape (function-based provider polymorphism + `EventStream<T,R>` as
a shared async-iterable primitive).

## Try it

```bash
pnpm install
pnpm --filter @pi-mono-stub/ai example
```
