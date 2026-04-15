import type { AgentTool } from "@pi-mono-stub/agent-core";
import { html, LitElement, type TemplateResult } from "../../lit-stubs.js";
import { ArtifactElement } from "./ArtifactElement.js";
import { DocxArtifact } from "./DocxArtifact.js";
import { ExcelArtifact } from "./ExcelArtifact.js";
import { HtmlArtifact } from "./HtmlArtifact.js";
import { ImageArtifact } from "./ImageArtifact.js";
import { MarkdownArtifact } from "./MarkdownArtifact.js";
import { PdfArtifact } from "./PdfArtifact.js";
import { SvgArtifact } from "./SvgArtifact.js";
import { TextArtifact } from "./TextArtifact.js";

// ------------------------------------------------------------
// createArtifactElement — factory: filename extension → subclass
// ------------------------------------------------------------

export function createArtifactElement(
  filename: string,
  content: string,
): ArtifactElement {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, new () => ArtifactElement> = {
    html: HtmlArtifact,
    svg: SvgArtifact,
    md: MarkdownArtifact,
    png: ImageArtifact,
    jpg: ImageArtifact,
    jpeg: ImageArtifact,
    pdf: PdfArtifact,
    docx: DocxArtifact,
    xlsx: ExcelArtifact,
    txt: TextArtifact,
  };
  const Ctor = map[ext] ?? TextArtifact;
  const el = new Ctor();
  el.filename = filename;
  el.content = content;
  return el;
}

// ------------------------------------------------------------
// ArtifactsPanel — side panel showing generated files
// ------------------------------------------------------------

export interface ArtifactsParams {
  filename: string;
  content: string;
}

export class ArtifactsPanel extends LitElement {
  private artifacts = new Map<string, ArtifactElement>();
  tool!: AgentTool; // Typed as AgentTool<ArtifactsParams> in real impl

  /** Called when the agent creates/updates an artifact */
  addArtifact(filename: string, content: string): void {
    const el = createArtifactElement(filename, content);
    this.artifacts.set(filename, el);
    this.requestUpdate();
  }

  render(): TemplateResult {
    return html`
      <div class="artifacts-panel">
        <h3>Artifacts</h3>
        ${Array.from(this.artifacts.entries()).map(
          ([name, el]) => html`
            <div class="artifact-entry">
              <span>${name}</span>
              ${el.render()}
            </div>
          `,
        )}
      </div>
    `;
  }
}
