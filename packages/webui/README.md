# @pi-mono-stub/webui

Stub of the `pi-web-ui` package from
[pi-mono](https://github.com/badlogic/pi-mono) — a Lit-based web
component set that composes into an agent chat UI with IndexedDB
persistence, tool visualization, and artifact previews.

See `_docs/pi-mono-oop-uml-architecture.md` §8 for the design rationale
behind Lit components and the `ArtifactElement` inheritance hierarchy.

## Try it

```bash
pnpm install
pnpm --filter @pi-mono-stub/webui example
```

Runs `bootstrap.ts` in Node — the Lit stubs are DOM-free, so the whole
component tree instantiates without a browser.
