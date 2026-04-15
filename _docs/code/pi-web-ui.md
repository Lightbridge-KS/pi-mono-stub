# `pi-web-ui` Stub

```ts
// ============================================================
// pi-web-ui — Lit Web Components Layer Stub
// ============================================================
//
// A set of Lit custom elements composable into an agent chat UI.
// Here we stub the architecture without real Lit decorators —
// just the class shapes, relationships, and patterns.
//
// Imports from prior modules (type-only stubs):
//

// --- from pi-agent-core ---
interface Agent {
  prompt(m: string): Promise<void>;
  subscribe(listener: (event: AgentEvent) => void): Unsubscribe;
  abort(): void;
  state(): AgentState;
}
interface AgentState {
  messages: AgentMessage[];
  isStreaming: boolean;
  tools: AgentTool[];
}
interface AgentEvent { kind: string; timestamp: number; payload?: unknown }
interface AgentTool { name: string; label: string; description: string; parameters: Record<string, unknown> }
type AgentMessage = { role: string; content?: string; toolCalls?: any[]; toolCallId?: string; result?: any }
type Unsubscribe = () => void;

// --- from lit (type stubs) ---
type TemplateResult = { strings: string[]; values: unknown[] };
declare function html(strings: TemplateStringsArray, ...values: unknown[]): TemplateResult;

abstract class LitElement {
  abstract render(): TemplateResult;
  requestUpdate(): void { /* triggers re-render */ }
  connectedCallback(): void {}
  disconnectedCallback(): void {}
}

// ============================================================
// PART 1: STORAGE LAYER
// ============================================================

// ------------------------------------------------------------
// 1. StorageBackend (Interface) — Pluggable persistence
// ------------------------------------------------------------

interface StorageBackend {
  get(k: string): Promise<any>;
  set(k: string, v: any): Promise<void>;
  delete(k: string): Promise<void>;
}

// ------------------------------------------------------------
// 2. IndexedDBStorageBackend — Browser-native impl
// ------------------------------------------------------------

class IndexedDBStorageBackend implements StorageBackend {
  private dbName: string;
  private storeName: string;

  constructor(dbName: string, storeName = "kv") {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async openDb(): Promise<IDBDatabase> {
    // Stub: open/create IndexedDB
    return {} as IDBDatabase;
  }

  async get(k: string): Promise<any> {
    // Stub: tx → objectStore.get(k)
    return undefined;
  }

  async set(k: string, v: any): Promise<void> {
    // Stub: tx → objectStore.put(v, k)
  }

  async delete(k: string): Promise<void> {
    // Stub: tx → objectStore.delete(k)
  }
}

// ------------------------------------------------------------
// 3. Store (Abstract) — Typed wrapper around a backend
// ------------------------------------------------------------

interface StoreConfig {
  prefix: string;
  version: number;
}

abstract class Store {
  private backend!: StorageBackend;

  setBackend(b: StorageBackend): void {
    this.backend = b;
  }

  abstract getConfig(): StoreConfig;

  protected async read(key: string): Promise<any> {
    const cfg = this.getConfig();
    return this.backend.get(`${cfg.prefix}:${key}`);
  }

  protected async write(key: string, value: any): Promise<void> {
    const cfg = this.getConfig();
    return this.backend.set(`${cfg.prefix}:${key}`, value);
  }

  protected async remove(key: string): Promise<void> {
    const cfg = this.getConfig();
    return this.backend.delete(`${cfg.prefix}:${key}`);
  }
}

// ------------------------------------------------------------
// 4. Concrete Stores
// ------------------------------------------------------------

class SettingsStore extends Store {
  getConfig(): StoreConfig {
    return { prefix: "settings", version: 1 };
  }
  async getTheme(): Promise<string> { return this.read("theme") ?? "dark"; }
  async setTheme(t: string): Promise<void> { return this.write("theme", t); }
}

class ProviderKeysStore extends Store {
  getConfig(): StoreConfig {
    return { prefix: "provider-keys", version: 1 };
  }
  async getKey(provider: string): Promise<string | undefined> { return this.read(provider); }
  async setKey(provider: string, key: string): Promise<void> { return this.write(provider, key); }
}

class SessionsStore extends Store {
  getConfig(): StoreConfig {
    return { prefix: "sessions", version: 1 };
  }
  async getSession(id: string): Promise<any> { return this.read(id); }
  async saveSession(id: string, data: any): Promise<void> { return this.write(id, data); }
}

class CustomProvidersStore extends Store {
  getConfig(): StoreConfig {
    return { prefix: "custom-providers", version: 1 };
  }
}

// ------------------------------------------------------------
// 5. AppStorage — Aggregates all 4 stores
// ------------------------------------------------------------

class AppStorage {
  public settings: SettingsStore;
  public providerKeys: ProviderKeysStore;
  public sessions: SessionsStore;
  public customProviders: CustomProvidersStore;

  constructor(backend: StorageBackend) {
    this.settings = new SettingsStore();
    this.providerKeys = new ProviderKeysStore();
    this.sessions = new SessionsStore();
    this.customProviders = new CustomProvidersStore();

    // Inject the same backend into all stores
    this.settings.setBackend(backend);
    this.providerKeys.setBackend(backend);
    this.sessions.setBackend(backend);
    this.customProviders.setBackend(backend);
  }
}

// ============================================================
// PART 2: TOOL RENDERERS
// ============================================================

// ------------------------------------------------------------
// 6. ToolRenderer<I, R> — How a tool's I/O is visualized
// ------------------------------------------------------------
//
//  Each tool can have a custom renderer that knows how to
//  display its input (params sent to the tool) and its
//  result (what the tool returned).
//

interface ToolRenderer<I = unknown, R = unknown> {
  render(input: I, result?: R): TemplateResult;
}

// --- Concrete renderers ---

class BashRenderer implements ToolRenderer<
  { command: string },
  { exitCode: number; stdout: string }
> {
  render(input: { command: string }, result?: { exitCode: number; stdout: string }): TemplateResult {
    // Stub: render a terminal-style block with command + output
    return html`<div class="bash-tool">$ ${input.command}</div>`;
  }
}

class CalculateRenderer implements ToolRenderer<
  { expression: string },
  { value: number }
> {
  render(input: { expression: string }, result?: { value: number }): TemplateResult {
    return html`<div class="calc-tool">${input.expression} = ${result?.value}</div>`;
  }
}

class ArtifactsToolRenderer implements ToolRenderer<
  { filename: string; content: string },
  void
> {
  render(input: { filename: string; content: string }): TemplateResult {
    return html`<div class="artifact-tool">Created: ${input.filename}</div>`;
  }
}

/** Registry: tool name → renderer */
const toolRenderers = new Map<string, ToolRenderer>([
  ["bash", new BashRenderer()],
  ["calculate", new CalculateRenderer()],
  ["artifacts", new ArtifactsToolRenderer()],
]);

// ============================================================
// PART 3: ARTIFACT ELEMENTS
// ============================================================

// ------------------------------------------------------------
// 7. ArtifactElement (Abstract) — Base for renderable artifacts
// ------------------------------------------------------------
//
//  Each file type the agent creates gets its own element
//  that knows how to preview it in the browser.
//

abstract class ArtifactElement extends LitElement {
  public filename: string = "";
  public content: string = "";

  /** Toolbar buttons specific to this artifact type */
  abstract getHeaderButtons(): HTMLElement[];

  render(): TemplateResult {
    return html`<div class="artifact">${this.filename}</div>`;
  }
}

// --- Concrete artifact elements ---

class HtmlArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    // "Open in new tab", "Copy HTML"
    return [];
  }
  render(): TemplateResult {
    // Render HTML in a sandboxed iframe
    return html`<iframe srcdoc="${this.content}"></iframe>`;
  }
}

class SvgArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    // "Download SVG", "Copy"
    return [];
  }
  render(): TemplateResult {
    return html`<div class="svg-preview">${this.content}</div>`;
  }
}

class MarkdownArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Copy markdown", "Download .md"
  }
  render(): TemplateResult {
    // Stub: parse MD → HTML
    return html`<div class="md-preview">${this.content}</div>`;
  }
}

class ImageArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Download", "Open full size"
  }
  render(): TemplateResult {
    return html`<img src="${this.content}" alt="${this.filename}" />`;
  }
}

class PdfArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Download PDF"
  }
  render(): TemplateResult {
    return html`<embed src="${this.content}" type="application/pdf" />`;
  }
}

class DocxArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Download .docx"
  }
}

class ExcelArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Download .xlsx", "View as table"
  }
}

class TextArtifact extends ArtifactElement {
  getHeaderButtons(): HTMLElement[] {
    return []; // "Copy", "Download"
  }
  render(): TemplateResult {
    return html`<pre>${this.content}</pre>`;
  }
}

/** Factory: filename extension → ArtifactElement subclass */
function createArtifactElement(filename: string, content: string): ArtifactElement {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, new () => ArtifactElement> = {
    html: HtmlArtifact,
    svg: SvgArtifact,
    md: MarkdownArtifact,
    png: ImageArtifact,
    jpg: ImageArtifact,
    jpeg: ImageArtifact,
    pdf: PdfArtifact,
    docx: DocxArtifact,
    xlsx: ExcelArtifact,
    txt: TextArtifact,
  };
  const Ctor = map[ext] ?? TextArtifact;
  const el = new Ctor();
  el.filename = filename;
  el.content = content;
  return el;
}

// ============================================================
// PART 4: CHAT COMPONENTS (Lit Elements)
// ============================================================

// ------------------------------------------------------------
// 8. Message Components — Render each message type
// ------------------------------------------------------------

class UserMessage extends LitElement {
  public message: AgentMessage = { role: "user", content: "" };

  render(): TemplateResult {
    return html`<div class="user-msg">${this.message.content}</div>`;
  }
}

class AssistantMessageView extends LitElement {
  public message: AgentMessage = { role: "assistant", content: "" };

  render(): TemplateResult {
    // Renders markdown content + any tool call indicators
    return html`<div class="assistant-msg">${this.message.content}</div>`;
  }
}

class StreamingMessageContainer extends LitElement {
  public message: AgentMessage = { role: "assistant", content: "" };
  public isStreaming = false;

  render(): TemplateResult {
    return html`
      <div class="streaming ${this.isStreaming ? "active" : ""}">
        ${this.message.content}
        ${this.isStreaming ? html`<span class="cursor">▊</span>` : ""}
      </div>`;
  }
}

class ToolMessage extends LitElement {
  public message: AgentMessage = { role: "tool" };

  render(): TemplateResult {
    // Look up the appropriate ToolRenderer
    const toolName = (this.message as any).toolName ?? "unknown";
    const renderer = toolRenderers.get(toolName);
    if (renderer) {
      return renderer.render(this.message, this.message.result);
    }
    return html`<div class="tool-msg">[${toolName}] ${JSON.stringify(this.message.result)}</div>`;
  }
}

// ------------------------------------------------------------
// 9. MessageList — Scrollable list of all messages
// ------------------------------------------------------------

class MessageList extends LitElement {
  public messages: AgentMessage[] = [];

  render(): TemplateResult {
    // Stub: map each message to the appropriate component
    return html`<div class="message-list">
      ${this.messages.map((m) => {
        switch (m.role) {
          case "user":      return html`<pi-user-message></pi-user-message>`;
          case "assistant": return html`<pi-assistant-message></pi-assistant-message>`;
          case "tool":      return html`<pi-tool-message></pi-tool-message>`;
          default:          return html``;
        }
      })}
    </div>`;
  }
}

// ------------------------------------------------------------
// 10. MessageEditor — Input area for composing messages
// ------------------------------------------------------------

class MessageEditor extends LitElement {
  public onSubmit?: (text: string) => void;
  private draft = "";

  render(): TemplateResult {
    return html`
      <div class="editor">
        <textarea placeholder="Message pi..."></textarea>
        <button>Send</button>
      </div>`;
  }

  /** Called by event handler */
  private handleSubmit(): void {
    if (this.draft.trim() && this.onSubmit) {
      this.onSubmit(this.draft);
      this.draft = "";
      this.requestUpdate();
    }
  }
}

// ------------------------------------------------------------
// 11. ArtifactsPanel — Side panel showing generated files
// ------------------------------------------------------------

interface ArtifactsParams {
  filename: string;
  content: string;
}

class ArtifactsPanel extends LitElement {
  private artifacts = new Map<string, ArtifactElement>();
  public tool!: AgentTool;  // AgentTool<ArtifactsParams>

  /** Called when the agent creates/updates an artifact */
  addArtifact(filename: string, content: string): void {
    const el = createArtifactElement(filename, content);
    this.artifacts.set(filename, el);
    this.requestUpdate();
  }

  render(): TemplateResult {
    return html`
      <div class="artifacts-panel">
        <h3>Artifacts</h3>
        ${Array.from(this.artifacts.entries()).map(
          ([name, el]) => html`
            <div class="artifact-entry">
              <span>${name}</span>
              ${el.render()}
            </div>`,
        )}
      </div>`;
  }
}

// ------------------------------------------------------------
// 12. AgentInterface — Manages agent subscription lifecycle
// ------------------------------------------------------------

class AgentInterface extends LitElement {
  public session?: Agent;
  private unsubscribe?: Unsubscribe;

  connectedCallback(): void {
    super.connectedCallback();
    this.setupSessionSubscription();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private setupSessionSubscription(): void {
    if (!this.session) return;
    this.unsubscribe = this.session.subscribe((event) => {
      // Propagate agent events to child components via
      // CustomEvent dispatch or reactive property updates
      this.requestUpdate();
    });
  }

  render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

// ------------------------------------------------------------
// 13. ChatPanel — Top-level composition element
// ------------------------------------------------------------
//
//  The "page-level" component that wires everything together.
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

class ChatPanel extends LitElement {
  public agent?: Agent;

  private messageList = new MessageList();
  private editor = new MessageEditor();
  private streamingMsg = new StreamingMessageContainer();
  private artifactsPanel = new ArtifactsPanel();
  private agentInterface = new AgentInterface();

  async setAgent(a: Agent, cfg?: Record<string, unknown>): Promise<void> {
    this.agent = a;
    this.agentInterface.session = a;

    // Wire editor submit → agent prompt
    this.editor.onSubmit = (text) => {
      this.agent?.prompt(text);
    };

    // Subscribe to state updates
    a.subscribe((event) => {
      const state = a.state();
      this.messageList.messages = state.messages;
      this.streamingMsg.isStreaming = state.isStreaming;

      if (event.kind === "tool-call-end") {
        const call = event.payload as any;
        if (call?.name === "artifacts") {
          this.artifactsPanel.addArtifact(
            call.arguments.filename,
            call.arguments.content,
          );
        }
      }
      this.requestUpdate();
    });
  }

  render(): TemplateResult {
    return html`
      <div class="chat-layout">
        <main class="chat-main">
          ${this.messageList.render()}
          ${this.streamingMsg.render()}
          ${this.editor.render()}
        </main>
        <aside class="chat-sidebar">
          ${this.artifactsPanel.render()}
        </aside>
      </div>`;
  }
}

// ============================================================
// EXAMPLE: Bootstrapping the web app
// ============================================================

async function bootstrapApp() {
  // 1. Set up storage
  const backend = new IndexedDBStorageBackend("pi-web-ui");
  const storage = new AppStorage(backend);

  // 2. Load saved settings
  const theme = await storage.settings.getTheme();
  document.documentElement.setAttribute("data-theme", theme);

  // 3. Create a stub agent (real app imports from pi-agent-core)
  const agent: Agent = {
    _listeners: new Set(),
    _state: { messages: [], isStreaming: false, tools: [] },
    async prompt(m) {
      (this as any)._state.messages.push({ role: "user", content: m });
      for (const l of (this as any)._listeners) l({ kind: "message-added", timestamp: Date.now() });
      // Simulate LLM response
      setTimeout(() => {
        (this as any)._state.messages.push({ role: "assistant", content: "Here's what I found..." });
        for (const l of (this as any)._listeners) l({ kind: "message-added", timestamp: Date.now() });
      }, 100);
    },
    subscribe(fn) {
      (this as any)._listeners.add(fn);
      return () => (this as any)._listeners.delete(fn);
    },
    abort() {},
    state() { return (this as any)._state; },
  } as any;

  // 4. Mount the chat panel
  const chatPanel = new ChatPanel();
  await chatPanel.setAgent(agent);

  // In real app: document.body.appendChild(chatPanel)
  console.log("[app] pi-web-ui bootstrapped with theme:", theme);
}

bootstrapApp().catch(console.error);
```