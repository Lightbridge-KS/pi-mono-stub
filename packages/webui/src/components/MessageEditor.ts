import { html, LitElement, type TemplateResult } from "../lit-stubs.js";

// ------------------------------------------------------------
// MessageEditor — input area for composing messages
// ------------------------------------------------------------

export class MessageEditor extends LitElement {
  onSubmit?: (text: string) => void;
  private draft = "";

  render(): TemplateResult {
    return html`
      <div class="editor">
        <textarea placeholder="Message pi..."></textarea>
        <button>Send</button>
      </div>
    `;
  }

  /** Called by event handler in real Lit impl */
  private handleSubmit(): void {
    if (this.draft.trim() && this.onSubmit) {
      this.onSubmit(this.draft);
      this.draft = "";
      this.requestUpdate();
    }
  }
}
