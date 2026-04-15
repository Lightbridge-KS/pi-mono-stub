import { ArtifactElement } from "./ArtifactElement.js";

export class DocxArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Download .docx"
  }
  // Uses default render() from ArtifactElement
}
