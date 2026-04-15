import type { AgentMessage } from "@pi-mono-stub/agent-core";
import { html, LitElement, type TemplateResult } from "../lit-stubs.js";
import { toolRenderers } from "../tools/renderers.js";

// ------------------------------------------------------------
// ToolMessage — renders a tool result message
// ------------------------------------------------------------
//
//  The parent (MessageList) sets `toolName` when it knows the name
//  of the tool that produced this result — in the real pi-web-ui
//  this is recovered by matching `toolCallId` against the preceding
//  assistant message's toolCalls. For the stub we leave it blank
//  and fall back to a generic display.
//

export class ToolMessage extends LitElement {
  message: AgentMessage = {
    role: "tool",
    toolCallId: "",
    result: { success: true, output: "" },
  };
  toolName: string = "";

  render(): TemplateResult {
    if (this.message.role !== "tool") return html``;

    const renderer = this.toolName ? toolRenderers.get(this.toolName) : undefined;
    if (renderer) {
      // The renderer's input/result types are tool-specific; the
      // stub hands the raw result through. Real impl would pull the
      // original call arguments from the session history.
      return renderer.render(
        this.message.result as unknown,
        this.message.result as unknown,
      );
    }

    return html`
      <div class="tool-msg">
        [${this.toolName || "tool"} ${this.message.toolCallId}]
        ${JSON.stringify(this.message.result)}
      </div>
    `;
  }
}
