import { html, type TemplateResult } from "../../lit-stubs.js";
import { ArtifactElement } from "./ArtifactElement.js";

export class PdfArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Download PDF"
  }

  render(): TemplateResult {
    return html`<embed src="${this.content}" type="application/pdf" />`;
  }
}
