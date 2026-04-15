import { html, type TemplateResult } from "../../lit-stubs.js";
import { ArtifactElement } from "./ArtifactElement.js";

export class SvgArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Download SVG", "Copy"
  }

  render(): TemplateResult {
    return html`<div class="svg-preview">${this.content}</div>`;
  }
}
