import { html, type TemplateResult } from "../../lit-stubs.js";
import { ArtifactElement } from "./ArtifactElement.js";

export class TextArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Copy", "Download"
  }

  render(): TemplateResult {
    return html`<pre>${this.content}</pre>`;
  }
}
