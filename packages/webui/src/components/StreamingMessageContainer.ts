import type { AgentMessage } from "@pi-mono-stub/agent-core";
import { html, LitElement, type TemplateResult } from "../lit-stubs.js";

// ------------------------------------------------------------
// StreamingMessageContainer — shows the in-flight assistant reply
// ------------------------------------------------------------

export class StreamingMessageContainer extends LitElement {
  message: AgentMessage = { role: "assistant", content: "" };
  isStreaming = false;

  render(): TemplateResult {
    const content =
      this.message.role === "assistant" ? this.message.content : "";
    return html`
      <div class="streaming ${this.isStreaming ? "active" : ""}">
        ${content} ${this.isStreaming ? html`<span class="cursor">▊</span>` : ""}
      </div>
    `;
  }
}
