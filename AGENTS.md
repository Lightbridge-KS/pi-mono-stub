# Pi-mono Stub

Educational repo for learning the architecture of [pi-mono](https://github.com/badlogic/pi-mono), a TypeScript LLM agent platform. Each package in this repo is a **stub** of the corresponding real pi-mono package, sharing the same file layout so you can compare side-by-side.

## Layout

pnpm workspace monorepo. Current packages (of 7 planned):

| Stub                            | Mirrors real pi-mono              | §  |
| ------------------------------- | --------------------------------- | -- |
| `packages/ai/`                  | `packages/ai/`                    | §4 |
| `packages/tui/`                 | `packages/tui/`                   | §5 |
| `packages/agent-core/`          | `packages/agent/`                 | §6 |
| `packages/coding-agent/`        | `packages/coding-agent/`          | §7 |
| `packages/webui/`               | `packages/web-ui/`                | §8 |
| _not yet stubbed_               | `packages/mom/`                   | §9 |
| _not yet stubbed_               | `packages/pods/`                  | §9 |

**Authoritative file map**: `_docs/pi-mono-oop-uml-architecture.md` §12 ("Reading-the-code map") lists the canonical source file for every abstraction. Follow it when placing new code.

## Workflow for stubbing a new package

Source stubs land in `_temp/<pkg>.md` (gitignored). To lay one out:

1. Ask the user for any choices not implied by the stub (scaffolding, example location, fidelity).
2. Split the stub across files per §12. For classes not listed in §12, use the stub's own section boundaries.
3. Replace the stub's inline "re-exports from other packages" with real `workspace:*` imports from the already-stubbed packages.
4. In the `examples/` or `bin/`, wire a real `Agent` + `anthropicProvider.stream` where the stub used an ad-hoc `as any` agent.
5. Run `pnpm --filter @pi-mono-stub/<pkg> typecheck` then `… example`.

## Conventions

- **Strict TS** (see `tsconfig.base.json`): `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any`; prefer `unknown` + narrowing. Replace stub `as any` casts with `as unknown as T` or proper type guards.
- **ES module imports use `.js` suffix** even when the source is `.ts` (`moduleResolution: "Bundler"`).
- **Public methods before private** in class bodies (user's global preference).
- **`exactOptionalPropertyTypes` landmines**: build objects with conditional spreads rather than `field: undefined` when the target has `field?: T` (not `field?: T | undefined`).
- **Package naming**: directory is whatever the user asks for (e.g. `webui`, `coding-agent`); npm name is always `@pi-mono-stub/<dir>`.
- **File naming**: kebab-case for plain modules (`app-storage.ts`), PascalCase for LitElement component files in `webui` only (`ChatPanel.ts`, `ArtifactElement.ts`) — matches §12.

## Commands

```bash
pnpm install
pnpm -r typecheck                                    # all packages
pnpm --filter @pi-mono-stub/<pkg> typecheck          # single package
pnpm --filter @pi-mono-stub/<pkg> example            # runnable demo
```

Interactive demos (`coding-agent` interactive mode, `tui` with `tui.start()`) enter raw mode + alt screen — avoid running them from automated tools. The default `example` script for each package is non-interactive.
