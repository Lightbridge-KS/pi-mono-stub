import type { AgentMessage } from "@pi-mono-stub/agent-core";
import { html, LitElement, type TemplateResult } from "../lit-stubs.js";

// ------------------------------------------------------------
// AssistantMessageView — renders an assistant-authored message
// ------------------------------------------------------------

export class AssistantMessageView extends LitElement {
  message: AgentMessage = { role: "assistant", content: "" };

  render(): TemplateResult {
    // Real impl would render markdown content + any tool call indicators
    const content =
      this.message.role === "assistant" ? this.message.content : "";
    return html`<div class="assistant-msg">${content}</div>`;
  }
}
