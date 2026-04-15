import { ArtifactElement } from "./ArtifactElement.js";

export class ExcelArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Download .xlsx", "View as table"
  }
  // Uses default render() from ArtifactElement
}
