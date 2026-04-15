import { html, type TemplateResult } from "../../lit-stubs.js";
import { ArtifactElement } from "./ArtifactElement.js";

export class MarkdownArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Copy markdown", "Download .md"
  }

  render(): TemplateResult {
    // Stub: real impl parses MD → HTML
    return html`<div class="md-preview">${this.content}</div>`;
  }
}
