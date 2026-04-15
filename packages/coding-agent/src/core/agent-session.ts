import type {
  Agent,
  AgentEvent,
  AgentMessage,
  AgentTool,
  Unsubscribe,
} from "@pi-mono-stub/agent-core";
import { ExtensionRunner } from "./extensions/runner.js";
import { ModelRegistry } from "./model-registry.js";
import { SessionManager } from "./session-manager.js";
import { SettingsManager } from "./settings-manager.js";
import {
  wrapToolDefinition,
  type ToolDefinition,
} from "./tools/tool-definition-wrapper.js";

// ------------------------------------------------------------
// AgentSession — central coordinator (Facade)
// ------------------------------------------------------------
//
//  Owns and wires together all subsystems. The "Facade" that modes
//  (Interactive, Print, Rpc) interact with.
//

export interface CompactOptions {
  keepSystemMessages?: boolean;
  maxMessages?: number;
}

export interface AgentSessionConfig {
  agent: Agent;
  sessionManager: SessionManager;
  settings: SettingsManager;
  models: ModelRegistry;
  extensions: ExtensionRunner;
  tools?: ToolDefinition[];
}

export class AgentSession {
  private agent: Agent;
  private sessionManager: SessionManager;
  private settings: SettingsManager;
  private models: ModelRegistry;
  private extensions: ExtensionRunner;
  private tools: AgentTool[];

  constructor(config: AgentSessionConfig) {
    this.agent = config.agent;
    this.sessionManager = config.sessionManager;
    this.settings = config.settings;
    this.models = config.models;
    this.extensions = config.extensions;

    // Wrap declarative ToolDefinitions into AgentTools
    this.tools = (config.tools ?? []).map(wrapToolDefinition);

    // Wire extension events to the agent + persist message-added events
    this.agent.subscribe((event) => {
      this.extensions.emit(event);
      if (event.kind === "message-added") {
        this.sessionManager.appendMessage(event.payload as AgentMessage);
      }
    });
  }

  // ----- Public API -----

  /** Send user input through the agent */
  async prompt(input: string): Promise<void> {
    await this.agent.prompt(input);
  }

  /** Compact conversation history to save context window */
  async compact(options?: CompactOptions): Promise<void> {
    const state = this.agent.state();
    const keep = options?.maxMessages ?? 10;
    if (state.messages.length <= keep) return;

    console.log(
      `[compact] Summarizing ${state.messages.length - keep} old messages`,
    );
    // Real impl would call the LLM to summarize, then agent.steer() with summary
  }

  /** Fork into a branched session (e.g., for speculative work) */
  fork(): AgentSession {
    return new AgentSession({
      agent: this.agent, // shares the agent
      sessionManager: this.sessionManager.branch(),
      settings: this.settings,
      models: this.models,
      extensions: this.extensions,
    });
  }

  /** Export conversation as HTML */
  exportToHtml(): string {
    const entries = this.sessionManager.getEntries();
    const lines = entries.map((e) => {
      const data = e.data as AgentMessage;
      const content =
        data.role === "user" || data.role === "assistant" ? data.content : "";
      return `<div class="msg ${data.role}">${content}</div>`;
    });
    return `<!DOCTYPE html>
<html><head><title>pi session</title></head>
<body>${lines.join("\n")}</body></html>`;
  }

  /** Subscribe to session-level events */
  addEventListener(fn: (event: AgentEvent) => void): Unsubscribe {
    return this.agent.subscribe(fn);
  }

  /** Expose internals for modes */
  getAgent(): Agent {
    return this.agent;
  }

  getSettings(): SettingsManager {
    return this.settings;
  }

  getModels(): ModelRegistry {
    return this.models;
  }

  getTools(): AgentTool[] {
    return [...this.tools];
  }
}
