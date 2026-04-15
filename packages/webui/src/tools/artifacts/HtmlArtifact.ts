import { html, type TemplateResult } from "../../lit-stubs.js";
import { ArtifactElement } from "./ArtifactElement.js";

export class HtmlArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Open in new tab", "Copy HTML"
  }

  render(): TemplateResult {
    // Render HTML in a sandboxed iframe
    return html`<iframe srcdoc="${this.content}"></iframe>`;
  }
}
