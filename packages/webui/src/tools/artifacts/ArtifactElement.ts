import { html, LitElement, type TemplateResult } from "../../lit-stubs.js";

// ------------------------------------------------------------
// ArtifactElement — abstract base for renderable artifacts
// ------------------------------------------------------------
//
//  Each file type the agent creates gets its own LitElement that
//  knows how to preview it in the browser. This is the single
//  inheritance root in the package, used because there's a real
//  axis of variation (file type → preview strategy).
//

export abstract class ArtifactElement extends LitElement {
  filename: string = "";
  content: string = "";

  /** Toolbar buttons specific to this artifact type */
  abstract getHeaderButtons(): HTMLElement[];

  render(): TemplateResult {
    return html`<div class="artifact">${this.filename}</div>`;
  }
}
