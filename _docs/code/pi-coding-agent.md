# `pi-coding-agent` Stub

```ts
// ============================================================
// pi-coding-agent — CLI Application Layer Stub
// ============================================================
//
// This is the top-level package whose binary is `pi`.
// It wires together:
//   - pi-ai          (LLM provider abstraction)
//   - pi-tui         (terminal UI components)
//   - pi-agent-core  (agent runtime loop)
//
// Imports from prior modules (stubbed as type-only here):
//

// --- from pi-agent-core ---
interface Agent {
  prompt(m: string, images?: string[]): Promise<void>;
  continue(): Promise<void>;
  subscribe(listener: (event: AgentEvent) => void): Unsubscribe;
  steer(m: AgentMessage): void;
  followUp(m: AgentMessage): void;
  abort(): void;
  waitForIdle(): Promise<void>;
  reset(): void;
  state(): AgentState;
}
interface AgentState {
  systemPrompt: string;
  model: Model;
  messages: AgentMessage[];
  isStreaming: boolean;
  tools: AgentTool[];
}
interface AgentTool {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
  prepareArguments(args: unknown): unknown;
  execute(
    id: string,
    params: unknown,
    signal: AbortSignal,
    cb: (progress: string) => void,
  ): Promise<AgentToolResult>;
}
interface AgentToolResult {
  success: boolean;
  output: string;
  error?: string;
}
interface AgentEvent {
  kind: string;
  timestamp: number;
  payload?: unknown;
}
type AgentMessage = Record<string, unknown>;
type Unsubscribe = () => void;

// --- from pi-ai ---
interface Model {
  id: string;
  api: string;
  provider: string;
  reasoning: boolean;
  cost: { inputPerToken: number; outputPerToken: number };
  contextWindow: number;
}

// --- from pi-tui ---
interface TUI {
  start(): void;
  render(): string[];
  handleInput(key: { key: string; ctrl?: boolean }): boolean;
  getRoot(): { addChild(c: unknown): void };
  setFocus(c: unknown): void;
}

// ============================================================
// 1. ToolDefinition<T, TDetails> — Declarative tool schema
// ============================================================
//
//  A clean, user-facing way to define tools using TypeBox
//  for parameter validation. Gets wrapped into an AgentTool
//  via wrapToolDefinition().
//

/** Placeholder for TypeBox schema type */
type TypeBox = Record<string, unknown>;

interface ToolDefinition<
  T = Record<string, unknown>,
  TDetails = unknown,
> {
  name: string;
  description: string;
  parameters: TypeBox;
  execute(params: T): Promise<ToolResult<TDetails>>;
}

interface ToolResult<TDetails = unknown> {
  success: boolean;
  output: string;
  details?: TDetails;
}

// ============================================================
// 2. wrapToolDefinition() — Adapter: ToolDefinition → AgentTool
// ============================================================
//
//  Bridges the declarative ToolDefinition API into the
//  AgentTool interface expected by pi-agent-core.
//

function wrapToolDefinition<T, TDetails>(
  def: ToolDefinition<T, TDetails>,
): AgentTool {
  return {
    name: def.name,
    label: def.name,
    description: def.description,
    parameters: def.parameters,

    prepareArguments(args: unknown): T {
      // Stub: validate `args` against def.parameters (TypeBox)
      return args as T;
    },

    async execute(id, params, signal, cb) {
      cb(`Executing ${def.name}...`);
      const result = await def.execute(params as T);
      return {
        success: result.success,
        output: result.output,
        error: result.success ? undefined : result.output,
      };
    },
  };
}

// ============================================================
// 3. SessionManager — Persists conversation to disk
// ============================================================

interface SessionEntry {
  id: string;
  timestamp: number;
  type: "message" | "tool-call" | "tool-result" | "meta";
  data: unknown;
}

class SessionManager {
  private dir: string;
  private entries: SessionEntry[] = [];

  constructor(dir: string) {
    this.dir = dir;
  }

  appendMessage(m: AgentMessage): void {
    this.entries.push({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "message",
      data: m,
    });
  }

  appendEntry(e: SessionEntry): void {
    this.entries.push(e);
  }

  getEntries(): SessionEntry[] {
    return [...this.entries];
  }

  /** Branch creates a new SessionManager that shares history up to now */
  branch(): SessionManager {
    const branched = new SessionManager(this.dir + "/branch-" + Date.now());
    branched.entries = [...this.entries]; // snapshot current history
    return branched;
  }
}

// ============================================================
// 4. SettingsManager — Key-value user preferences
// ============================================================

class SettingsManager {
  private store = new Map<string, unknown>();

  get(key: string): unknown {
    return this.store.get(key);
  }

  set(key: string, val: unknown): void {
    this.store.set(key, val);
  }

  async save(): Promise<void> {
    // Stub: serialize to ~/.pi/settings.json
    const data = Object.fromEntries(this.store);
    console.log("[settings] saved:", JSON.stringify(data));
  }
}

// ============================================================
// 5. ModelRegistry — Auth + provider management
// ============================================================

interface AuthStorage {
  getKey(provider: string): string | undefined;
  setKey(provider: string, key: string): void;
}

interface AuthInfo {
  apiKey: string;
  headers: Record<string, string>;
}

interface ProviderConfig {
  baseUrl: string;
  models: string[];
  authType: "api-key" | "oauth";
}

class ModelRegistry {
  private auth: AuthStorage;
  private providers = new Map<string, ProviderConfig>();

  constructor(auth: AuthStorage) {
    this.auth = auth;
  }

  getApiKeyAndHeaders(model: Model): AuthInfo {
    const key = this.auth.getKey(model.provider);
    if (!key) {
      throw new Error(
        `No API key for provider "${model.provider}". ` +
        `Run: pi auth login ${model.provider}`,
      );
    }
    return {
      apiKey: key,
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Model-Id": model.id,
      },
    };
  }

  isUsingOAuth(provider: string): boolean {
    return this.providers.get(provider)?.authType === "oauth";
  }

  registerProvider(name: string, config: ProviderConfig): void {
    this.providers.set(name, config);
  }

  unregisterProvider(name: string): void {
    this.providers.delete(name);
  }
}

// ============================================================
// 6. ExtensionRunner — Plugin system
// ============================================================

interface Extension {
  name: string;
  version: string;
  activate(ctx: ExtensionContext): void;
  deactivate?(): void;
}

interface ExtensionContext {
  registerTool(def: ToolDefinition): void;
  onEvent(kind: string, handler: (event: AgentEvent) => void): void;
}

interface ExtensionRuntime {
  sandboxEnabled: boolean;
  maxExtensions: number;
}

type ReloadHandler = () => Promise<void>;

class ExtensionRunner {
  private extensions: Extension[] = [];
  private runtime: ExtensionRuntime;
  private reloadHandler: ReloadHandler;

  private coreActions: Record<string, Function> = {};
  private commandActions: Record<string, Function> = {};

  constructor(
    runtime: ExtensionRuntime = { sandboxEnabled: false, maxExtensions: 50 },
    reloadHandler: ReloadHandler = async () => {},
  ) {
    this.runtime = runtime;
    this.reloadHandler = reloadHandler;
  }

  /** Bind actions that extensions can call (e.g., prompt, abort) */
  bindCore(actions: Record<string, Function>): void {
    this.coreActions = actions;
  }

  /** Bind slash-command actions */
  bindCommandContext(actions: Record<string, Function>): void {
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
      onEvent: (kind, handler) => {
        console.log(`[ext:${ext.name}] subscribed to: ${kind}`);
      },
    };

    ext.activate(ctx);
    this.extensions.push(ext);
  }

  /** Emit an event to all extensions */
  emit(event: AgentEvent): void {
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
}

// ============================================================
// 7. AgentSession — The central coordinator
// ============================================================
//
//  Owns and wires together all subsystems.
//  The "Facade" that modes (Interactive, Print, Rpc)
//  interact with.
//

interface CompactOptions {
  keepSystemMessages?: boolean;
  maxMessages?: number;
}

class AgentSession {
  private agent: Agent;
  private sessionManager: SessionManager;
  private settings: SettingsManager;
  private models: ModelRegistry;
  private extensions: ExtensionRunner;
  private tools: AgentTool[];

  constructor(config: {
    agent: Agent;
    sessionManager: SessionManager;
    settings: SettingsManager;
    models: ModelRegistry;
    extensions: ExtensionRunner;
    tools?: ToolDefinition[];
  }) {
    this.agent = config.agent;
    this.sessionManager = config.sessionManager;
    this.settings = config.settings;
    this.models = config.models;
    this.extensions = config.extensions;

    // Wrap declarative ToolDefinitions into AgentTools
    this.tools = (config.tools ?? []).map(wrapToolDefinition);

    // Wire extension events to the agent
    this.agent.subscribe((event) => {
      this.extensions.emit(event);
      if (event.kind === "message-added") {
        this.sessionManager.appendMessage(event.payload as AgentMessage);
      }
    });
  }

  /** Send user input through the agent */
  async prompt(input: string): Promise<void> {
    await this.agent.prompt(input);
  }

  /** Compact conversation history to save context window */
  async compact(options?: CompactOptions): Promise<void> {
    // Stub: summarize old messages, replace with summary
    const state = this.agent.state();
    const keep = options?.maxMessages ?? 10;
    if (state.messages.length <= keep) return;

    console.log(
      `[compact] Summarizing ${state.messages.length - keep} old messages`,
    );
    // Would call the LLM to summarize, then agent.steer() with summary
  }

  /** Fork into a branched session (e.g., for speculative work) */
  fork(): AgentSession {
    return new AgentSession({
      agent: this.agent, // shares the agent (or clone it)
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
      const data = e.data as Record<string, unknown>;
      return `<div class="msg ${data.role}">${data.content ?? ""}</div>`;
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
}

// ============================================================
// 8. Run Modes — InteractiveMode, PrintMode, RpcMode
// ============================================================

/** InteractiveMode — Full TUI with editor, streaming output */
class InteractiveMode {
  private tui: TUI;
  private session: AgentSession;

  constructor(tui: TUI, session: AgentSession) {
    this.tui = tui;
    this.session = session;
  }

  async run(): Promise<void> {
    // Wire session events → TUI re-renders
    this.session.addEventListener((event) => {
      this.tui.render();
    });

    // Start the TUI event loop
    this.tui.start();

    // Stub: the TUI's Editor.onSubmit would call:
    //   this.session.prompt(userInput)
    // which drives the agent loop and streams back via events
    console.log("[interactive] TUI started. Waiting for input...");
  }
}

/** PrintMode — One-shot: prompt → stream to stdout → exit */
class PrintMode {
  constructor(
    private session: AgentSession,
    private input: string,
  ) {}

  async run(): Promise<void> {
    // Stream output directly to stdout
    this.session.addEventListener((event) => {
      if (event.kind === "state-changed" && event.payload) {
        const delta = event.payload as { type?: string; delta?: string };
        if (delta.type === "text-delta" && delta.delta) {
          process.stdout.write(delta.delta);
        }
      }
    });

    await this.session.prompt(this.input);
    process.stdout.write("\n");
  }
}

/** RpcMode — JSON-RPC server for IDE integrations */
class RpcMode {
  constructor(private session: AgentSession) {}

  async run(): Promise<void> {
    // Stub: start a JSON-RPC server on stdin/stdout or a socket
    console.log("[rpc] Listening for JSON-RPC requests...");

    // Would handle methods like:
    //   { method: "prompt",  params: { text: "..." } }
    //   { method: "abort",   params: {} }
    //   { method: "state",   params: {} }
  }
}

// ============================================================
// 9. Built-in Tool Definitions
// ============================================================

const bashToolDef: ToolDefinition<
  { command: string },
  { exitCode: number }
> = {
  name: "bash",
  description: "Execute a shell command",
  parameters: { type: "object", properties: { command: { type: "string" } } },
  async execute(params) {
    // Stub: spawn child process
    return { success: true, output: `$ ${params.command}\n(output)`, details: { exitCode: 0 } };
  },
};

const readFileToolDef: ToolDefinition<
  { path: string; range?: [number, number] },
  { lineCount: number }
> = {
  name: "read_file",
  description: "Read a file from disk",
  parameters: { type: "object", properties: { path: { type: "string" } } },
  async execute(params) {
    // Stub: read from filesystem
    return { success: true, output: `(contents of ${params.path})`, details: { lineCount: 42 } };
  },
};

const writeFileToolDef: ToolDefinition<
  { path: string; content: string },
  { bytesWritten: number }
> = {
  name: "write_file",
  description: "Write content to a file",
  parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } } },
  async execute(params) {
    return { success: true, output: `Wrote ${params.path}`, details: { bytesWritten: params.content.length } };
  },
};

// ============================================================
// 10. CLI Entry Point — main()
// ============================================================

async function main() {
  const args = process.argv.slice(2);

  // --- Parse CLI flags ---
  const modeFlag = args.includes("--print")
    ? "print"
    : args.includes("--rpc")
      ? "rpc"
      : "interactive";

  const inputText = args.filter((a) => !a.startsWith("--")).join(" ");

  // --- Bootstrap subsystems ---
  const auth: AuthStorage = {
    getKey: (p) => process.env[`${p.toUpperCase()}_API_KEY`],
    setKey: () => {},
  };

  const settings = new SettingsManager();
  settings.set("theme", "dark");
  settings.set("model", "claude-sonnet-4-20250514");

  const models = new ModelRegistry(auth);
  models.registerProvider("anthropic", {
    baseUrl: "https://api.anthropic.com",
    models: ["claude-sonnet-4-20250514", "claude-opus-4-20250514"],
    authType: "api-key",
  });

  const sessionManager = new SessionManager(
    `${process.env.HOME}/.pi/sessions/${Date.now()}`,
  );

  const extensions = new ExtensionRunner();

  // --- Create a stub Agent (from pi-agent-core) ---
  const stubAgent: Agent = {
    _listeners: new Set<(e: AgentEvent) => void>(),
    async prompt(m) {
      console.log(`[agent] prompt: ${m}`);
      for (const l of this._listeners) {
        l({ kind: "stream-start", timestamp: Date.now() });
        l({
          kind: "state-changed",
          timestamp: Date.now(),
          payload: { type: "text-delta", delta: "I'll help with that." },
        });
        l({ kind: "stream-end", timestamp: Date.now() });
        l({ kind: "message-added", timestamp: Date.now(), payload: { role: "assistant", content: "I'll help with that." } });
      }
    },
    async continue() {},
    subscribe(fn) {
      this._listeners.add(fn);
      return () => this._listeners.delete(fn);
    },
    steer() {},
    followUp() {},
    abort() {},
    async waitForIdle() {},
    reset() {},
    state() {
      return {
        systemPrompt: "",
        model: { id: "claude-sonnet-4-20250514", api: "anthropic", provider: "anthropic", reasoning: true, cost: { inputPerToken: 0.003, outputPerToken: 0.015 }, contextWindow: 200000 },
        messages: [],
        isStreaming: false,
        tools: [],
      };
    },
  } as any;

  // --- Assemble the session ---
  const session = new AgentSession({
    agent: stubAgent,
    sessionManager,
    settings,
    models,
    extensions,
    tools: [bashToolDef, readFileToolDef, writeFileToolDef],
  });

  // --- Run the selected mode ---
  switch (modeFlag) {
    case "print":
      await new PrintMode(session, inputText || "Hello!").run();
      break;

    case "rpc":
      await new RpcMode(session).run();
      break;

    case "interactive":
    default:
      // Stub TUI (real impl comes from pi-tui)
      const stubTui: TUI = {
        start() { console.log("[tui] started"); },
        render() { return []; },
        handleInput() { return false; },
        getRoot() { return { addChild() {} }; },
        setFocus() {},
      };
      await new InteractiveMode(stubTui, session).run();
      break;
  }
}

main().catch(console.error);
```