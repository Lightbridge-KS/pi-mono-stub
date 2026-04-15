import { html, type TemplateResult } from "../../lit-stubs.js";
import { ArtifactElement } from "./ArtifactElement.js";

export class ImageArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Download", "Open full size"
  }

  render(): TemplateResult {
    return html`<img src="${this.content}" alt="${this.filename}" />`;
  }
}
