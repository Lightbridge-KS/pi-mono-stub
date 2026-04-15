import type { AgentEvent } from "@pi-mono-stub/agent-core";
import type { ToolDefinition } from "../tools/tool-definition-wrapper.js";

// ------------------------------------------------------------
// ExtensionRunner — plugin system
// ------------------------------------------------------------

export interface Extension {
  name: string;
  version: string;
  activate(ctx: ExtensionContext): void;
  deactivate?(): void;
}

export interface ExtensionContext {
  registerTool(def: ToolDefinition): void;
  onEvent(kind: string, handler: (event: AgentEvent) => void): void;
}

export interface ExtensionRuntime {
  sandboxEnabled: boolean;
  maxExtensions: number;
}

export type ReloadHandler = () => Promise<void>;

/** Callable bound to the runner via bindCore/bindCommandContext */
type ExtensionAction = (...args: unknown[]) => unknown;

export class ExtensionRunner {
  private extensions: Extension[] = [];
  private runtime: ExtensionRuntime;
  private reloadHandler: ReloadHandler;

  private coreActions: Record<string, ExtensionAction> = {};
  private commandActions: Record<string, ExtensionAction> = {};

  constructor(
    runtime: ExtensionRuntime = { sandboxEnabled: false, maxExtensions: 50 },
    reloadHandler: ReloadHandler = async () => {},
  ) {
    this.runtime = runtime;
    this.reloadHandler = reloadHandler;
  }

  /** Bind actions that extensions can call (e.g., prompt, abort) */
  bindCore(actions: Record<string, ExtensionAction>): void {
    this.coreActions = actions;
  }

  /** Bind slash-command actions */
  bindCommandContext(actions: Record<string, ExtensionAction>): void {
    this.commandActions = actions;
  }

  /** Load and activate an extension */
  load(ext: Extension): void {
    if (this.extensions.length >= this.runtime.maxExtensions) {
      throw new Error("Max extensions reached");
    }

    const ctx: ExtensionContext = {
      registerTool: (def) => {
        console.log(`[ext:${ext.name}] registered tool: ${def.name}`);
      },
      onEvent: (kind, _handler) => {
        console.log(`[ext:${ext.name}] subscribed to: ${kind}`);
      },
    };

    ext.activate(ctx);
    this.extensions.push(ext);
  }

  /** Emit an event to all extensions */
  emit(_event: AgentEvent): void {
    // Stub: broadcast to extension event handlers
  }

  /** Reload all extensions (e.g., after config change) */
  async reload(): Promise<void> {
    for (const ext of this.extensions) {
      ext.deactivate?.();
    }
    this.extensions = [];
    await this.reloadHandler();
  }

  /** Read the bound action tables (currently internal; exposed for diagnostics) */
  getBoundActions(): {
    core: Record<string, ExtensionAction>;
    command: Record<string, ExtensionAction>;
  } {
    return { core: this.coreActions, command: this.commandActions };
  }
}
