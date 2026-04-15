// ------------------------------------------------------------
// Minimal Lit stubs — stand in for `lit` in this educational repo
// ------------------------------------------------------------
//
// Real pi-web-ui imports from the `lit` npm package. We keep things
// self-contained here by providing the tiny subset needed:
//   - `html` tagged template → plain `{ strings, values }` record
//   - `LitElement` base class with `render()`, `requestUpdate()`,
//     `connectedCallback()`, `disconnectedCallback()`
//

export interface TemplateResult {
  strings: readonly string[];
  values: readonly unknown[];
}

export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): TemplateResult {
  return { strings: [...strings], values };
}

export abstract class LitElement {
  abstract render(): TemplateResult;

  /** Triggers a re-render in real Lit; no-op in this stub */
  requestUpdate(): void {}

  connectedCallback(): void {}

  disconnectedCallback(): void {}
}
