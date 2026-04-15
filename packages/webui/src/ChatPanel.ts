import type { Agent, ToolCallRecord } from "@pi-mono-stub/agent-core";
import { html, LitElement, type TemplateResult } from "./lit-stubs.js";
import { AgentInterface } from "./components/AgentInterface.js";
import { MessageEditor } from "./components/MessageEditor.js";
import { MessageList } from "./components/MessageList.js";
import { StreamingMessageContainer } from "./components/StreamingMessageContainer.js";
import { ArtifactsPanel } from "./tools/artifacts/artifacts.js";

// ------------------------------------------------------------
// ChatPanel — top-level composition element
// ------------------------------------------------------------
//
//    <pi-chat-panel>
//      <pi-agent-interface>
//        <pi-message-list />
//        <pi-streaming-message />
//        <pi-message-editor />
//      </pi-agent-interface>
//      <pi-artifacts-panel />
//    </pi-chat-panel>
//

export class ChatPanel extends LitElement {
  agent?: Agent;

  private messageList = new MessageList();
  private editor = new MessageEditor();
  private streamingMsg = new StreamingMessageContainer();
  private artifactsPanel = new ArtifactsPanel();
  private agentInterface = new AgentInterface();

  async setAgent(
    a: Agent,
    _cfg?: Record<string, unknown>,
  ): Promise<void> {
    this.agent = a;
    this.agentInterface.session = a;

    // Wire editor submit → agent prompt
    this.editor.onSubmit = (text) => {
      void this.agent?.prompt(text);
    };

    // Subscribe to state updates
    a.subscribe((event) => {
      const state = a.state();
      this.messageList.messages = state.messages;
      this.streamingMsg.isStreaming = state.isStreaming;

      if (event.kind === "tool-call-end") {
        const call = event.payload as ToolCallRecord | undefined;
        if (call?.name === "artifacts") {
          const args = call.arguments as {
            filename?: string;
            content?: string;
          };
          if (
            typeof args.filename === "string" &&
            typeof args.content === "string"
          ) {
            this.artifactsPanel.addArtifact(args.filename, args.content);
          }
        }
      }
      this.requestUpdate();
    });
  }

  render(): TemplateResult {
    return html`
      <div class="chat-layout">
        <main class="chat-main">
          ${this.messageList.render()} ${this.streamingMsg.render()}
          ${this.editor.render()}
        </main>
        <aside class="chat-sidebar">${this.artifactsPanel.render()}</aside>
      </div>
    `;
  }
}
