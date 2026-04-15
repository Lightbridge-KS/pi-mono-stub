import type { AgentMessage } from "@pi-mono-stub/agent-core";
import { html, LitElement, type TemplateResult } from "../lit-stubs.js";

// ------------------------------------------------------------
// UserMessage — renders a user-authored message
// ------------------------------------------------------------

export class UserMessage extends LitElement {
  message: AgentMessage = { role: "user", content: "" };

  render(): TemplateResult {
    const content = this.message.role === "user" ? this.message.content : "";
    return html`<div class="user-msg">${content}</div>`;
  }
}
