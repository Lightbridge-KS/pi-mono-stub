import type { AgentMessage } from "@pi-mono-stub/agent-core";
import { html, LitElement, type TemplateResult } from "../lit-stubs.js";

// ------------------------------------------------------------
// MessageList — scrollable list of all messages
// ------------------------------------------------------------

export class MessageList extends LitElement {
  messages: AgentMessage[] = [];

  render(): TemplateResult {
    // Stub: in the real impl each <pi-*-message> element gets its
    // message wired via Lit reactive properties. Here we just emit
    // a placeholder tag per message role.
    return html`
      <div class="message-list">
        ${this.messages.map((m) => {
          switch (m.role) {
            case "user":
              return html`<pi-user-message></pi-user-message>`;
            case "assistant":
              return html`<pi-assistant-message></pi-assistant-message>`;
            case "tool":
              return html`<pi-tool-message></pi-tool-message>`;
            default:
              return html``;
          }
        })}
      </div>
    `;
  }
}
