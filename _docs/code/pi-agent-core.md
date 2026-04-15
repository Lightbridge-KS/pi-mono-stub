# `pi-agent-core` Stub 

```ts
// ============================================================
// pi-agent-core — Agent Runtime Stub Implementation
// ============================================================
//
// Dependencies from pi-ai (imported from previous module):
//
//   - Model, Context, Message, AssistantMessage
//   - AssistantMessageEventStream, EventStream
//   - Tool (renamed PiAiTool here to avoid clash)
//

// ============================================================
// RE-EXPORTS from pi-ai (stubs for self-containment)
// ============================================================

interface Model {
  id: string;
  api: string;
  provider: string;
  reasoning: boolean;
  cost: { inputPerToken: number; outputPerToken: number };
  contextWindow: number;
}

interface Context {
  systemPrompt?: string;
  messages: AgentMessage[];
  tools?: PiAiTool[];
}

interface AssistantMessage {
  role: "assistant";
  content: string;
  toolCalls?: { id: string; name: string; arguments: Record<string, unknown> }[];
}

interface AssistantMessageEvent {
  type: "text-delta" | "tool-call-delta" | "done";
  delta?: string;
}

/** Abstract base from pi-ai */
abstract class AssistantMessageEventStream {
  protected queue: AssistantMessageEvent[] = [];
  protected done = false;

  abstract push(event: AssistantMessageEvent): void;
  abstract end(result?: AssistantMessage): void;
  abstract result(): Promise<AssistantMessage>;
  abstract [Symbol.asyncIterator](): AsyncIterator<AssistantMessageEvent>;
}

/** The pi-ai Tool type (used as base for AgentTool) */
interface PiAiTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// ============================================================
// AGENT-CORE TYPES
// ============================================================

// ------------------------------------------------------------
// 1. AgentMessage — Messages within the agent loop
// ------------------------------------------------------------

type AgentMessage =
  | { role: "user"; content: string; images?: string[] }
  | { role: "assistant"; content: string; toolCalls?: ToolCallRecord[] }
  | { role: "tool"; toolCallId: string; result: AgentToolResult };

interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ------------------------------------------------------------
// 2. AgentToolResult
// ------------------------------------------------------------

interface AgentToolResult {
  success: boolean;
  output: string;
  error?: string;
}

// ------------------------------------------------------------
// 3. AgentState (Interface) — Immutable snapshot
// ------------------------------------------------------------
//
//  Returned by Agent.state(). Consumers read this;
//  they never mutate it directly.
//

interface AgentState {
  systemPrompt: string;
  model: Model;
  thinkingLevel: string;
  tools: AgentTool[];
  messages: AgentMessage[];
  isStreaming: boolean;
  streamingMessage: AgentMessage;
  pendingToolCalls: ReadonlySet<string>;
  errorMessage: string;
}

// ------------------------------------------------------------
// 4. MutableAgentState — Internal mutable version
// ------------------------------------------------------------
//
//  Uses copy-on-assign for tools[] and messages[]
//  to prevent external mutation of snapshots.
//

class MutableAgentState {
  private _tools: AgentTool[] = [];
  private _messages: AgentMessage[] = [];

  systemPrompt = "";
  model!: Model;
  thinkingLevel = "normal";
  isStreaming = false;
  streamingMessage: AgentMessage = { role: "assistant", content: "" };
  pendingToolCalls = new Set<string>();
  errorMessage = "";

  /** Copy-on-assign: returns a shallow copy */
  get tools(): AgentTool[] {
    return [...this._tools];
  }
  set tools(value: AgentTool[]) {
    this._tools = [...value]; // defensive copy
  }

  /** Copy-on-assign: returns a shallow copy */
  get messages(): AgentMessage[] {
    return [...this._messages];
  }
  set messages(value: AgentMessage[]) {
    this._messages = [...value]; // defensive copy
  }

  /** Push without full copy (internal fast path) */
  pushMessage(m: AgentMessage): void {
    this._messages.push(m);
  }

  /** Produce an immutable snapshot */
  snapshot(): AgentState {
    return {
      systemPrompt: this.systemPrompt,
      model: this.model,
      thinkingLevel: this.thinkingLevel,
      tools: this.tools,           // already copied by getter
      messages: this.messages,     // already copied by getter
      isStreaming: this.isStreaming,
      streamingMessage: this.streamingMessage,
      pendingToolCalls: new Set(this.pendingToolCalls),
      errorMessage: this.errorMessage,
    };
  }
}

// ------------------------------------------------------------
// 5. PendingMessageQueue — Buffered message injection
// ------------------------------------------------------------
//
//  Two queues exist on the Agent:
//    - steeringQueue  → high-priority, injected before next turn
//    - followUpQueue  → enqueued for after current turn completes
//

type QueueMode = "fifo" | "lifo" | "replace";

class PendingMessageQueue {
  private items: AgentMessage[] = [];
  private mode: QueueMode;

  constructor(mode: QueueMode = "fifo") {
    this.mode = mode;
  }

  enqueue(m: AgentMessage): void {
    if (this.mode === "replace") {
      this.items = [m];
    } else {
      this.items.push(m);
    }
  }

  /** Drain all pending items in order, clearing the queue */
  drain(): AgentMessage[] {
    const out =
      this.mode === "lifo" ? this.items.reverse() : [...this.items];
    this.items = [];
    return out;
  }

  get length(): number {
    return this.items.length;
  }
}

// ------------------------------------------------------------
// 6. StreamFn (Type) — The function that calls the LLM
// ------------------------------------------------------------

type StreamFn = (
  model: Model,
  context: Context,
  options?: Record<string, unknown>,
) => AssistantMessageEventStream;

// ------------------------------------------------------------
// 7. AgentTool (Interface) — extends PiAiTool
// ------------------------------------------------------------
//
//  Each tool knows how to:
//    1. prepareArguments()  → validate & transform raw args
//    2. execute()           → run the tool and return a result
//

interface AgentTool<TParams = Record<string, unknown>> extends PiAiTool {
  name: string;
  label: string;
  description: string;
  parameters: TParams & Record<string, unknown>;

  /** Validate and transform raw LLM arguments */
  prepareArguments(args: unknown): TParams;

  /** Execute the tool. Receives an AbortSignal and a progress callback. */
  execute(
    id: string,
    params: TParams,
    signal: AbortSignal,
    cb: (progress: string) => void,
  ): Promise<AgentToolResult>;
}

// ------------------------------------------------------------
// 8. Hook Types — Before / After tool call interception
// ------------------------------------------------------------

type BeforeToolCallHook = (
  tool: AgentTool,
  args: Record<string, unknown>,
) => Promise<Record<string, unknown> | null>;
//  Return null to skip the tool call entirely.

type AfterToolCallHook = (
  tool: AgentTool,
  result: AgentToolResult,
) => Promise<AgentToolResult>;

type ConvertFn = (messages: AgentMessage[]) => unknown[];
type TransformFn = (context: Context) => Context;

// ------------------------------------------------------------
// 9. AgentEvent (Union) — Events emitted to listeners
// ------------------------------------------------------------

type AgentEventKind =
  | "state-changed"
  | "message-added"
  | "tool-call-start"
  | "tool-call-end"
  | "stream-start"
  | "stream-end"
  | "error";

interface AgentEvent {
  kind: AgentEventKind;
  timestamp: number;
  payload?: unknown;

  /** Reconstruct the full AssistantMessage from accumulated events */
  reconstruct(): AssistantMessage;
}

type AgentListener = (event: AgentEvent) => void;
type Unsubscribe = () => void;

// ------------------------------------------------------------
// 10. ProxyMessageEventStream
// ------------------------------------------------------------
//
//  Wraps an underlying AssistantMessageEventStream.
//  Lets the Agent intercept / transform events before they
//  reach consumers (e.g., to inject AgentEvents).
//

class ProxyMessageEventStream extends AssistantMessageEventStream {
  private source: AssistantMessageEventStream;
  private onEvent?: (e: AssistantMessageEvent) => void;
  private resultPromise: Promise<AssistantMessage>;
  private resolveResult!: (msg: AssistantMessage) => void;

  constructor(
    source: AssistantMessageEventStream,
    onEvent?: (e: AssistantMessageEvent) => void,
  ) {
    super();
    this.source = source;
    this.onEvent = onEvent;
    this.resultPromise = new Promise((resolve) => {
      this.resolveResult = resolve;
    });
  }

  push(event: AssistantMessageEvent): void {
    this.onEvent?.(event);   // intercept
    this.queue.push(event);
  }

  end(result?: AssistantMessage): void {
    this.done = true;
    if (result) this.resolveResult(result);
  }

  result(): Promise<AssistantMessage> {
    return this.resultPromise;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<AssistantMessageEvent> {
    // Delegate to source stream, intercepting each event
    for await (const event of this.source) {
      this.push(event);
      yield event;
    }
  }
}

// ------------------------------------------------------------
// 11. Agent — The central orchestrator
// ------------------------------------------------------------
//
//  Lifecycle of a single turn:
//
//    prompt(m) / continue() / followUp(m)
//         │
//         ▼
//    ┌─ drain steeringQueue ──┐
//    │  build Context          │
//    │  transformContext()      │
//    │  streamFn(model, ctx)   │ ← calls LLM
//    │         │               │
//    │    for await (event)    │
//    │      ├─ text-delta      │ → emit AgentEvent, build message
//    │      └─ tool-call       │ → beforeToolCall → execute → afterToolCall
//    │         │               │
//    │    stream ends          │
//    │  push AssistantMessage  │
//    │  drain followUpQueue    │ → loop if non-empty
//    └────────────────────────┘
//

class Agent {
  // --- private state ---
  private _state: MutableAgentState;
  private listeners = new Set<AgentListener>();
  private steeringQueue: PendingMessageQueue;
  private followUpQueue: PendingMessageQueue;
  private abortController: AbortController | null = null;
  private idlePromise: Promise<void> | null = null;
  private idleResolve: (() => void) | null = null;

  // --- pluggable functions & hooks ---
  public streamFn: StreamFn;
  public convertToLlm: ConvertFn;
  public transformContext: TransformFn;
  public beforeToolCall: BeforeToolCallHook;
  public afterToolCall: AfterToolCallHook;

  constructor(config: {
    model: Model;
    systemPrompt: string;
    tools?: AgentTool[];
    streamFn: StreamFn;
    convertToLlm?: ConvertFn;
    transformContext?: TransformFn;
    beforeToolCall?: BeforeToolCallHook;
    afterToolCall?: AfterToolCallHook;
  }) {
    this._state = new MutableAgentState();
    this._state.model = config.model;
    this._state.systemPrompt = config.systemPrompt;
    this._state.tools = config.tools ?? [];

    this.steeringQueue = new PendingMessageQueue("fifo");
    this.followUpQueue = new PendingMessageQueue("fifo");

    this.streamFn = config.streamFn;
    this.convertToLlm = config.convertToLlm ?? ((msgs) => msgs);
    this.transformContext = config.transformContext ?? ((ctx) => ctx);
    this.beforeToolCall = config.beforeToolCall ?? (async (_t, args) => args);
    this.afterToolCall = config.afterToolCall ?? (async (_t, res) => res);
  }

  // ----- Public API -----

  /** Start a new turn with a user message */
  async prompt(m: string, images?: string[]): Promise<void> {
    const userMsg: AgentMessage = { role: "user", content: m, images };
    this._state.pushMessage(userMsg);
    this.emit({ kind: "message-added", payload: userMsg });
    await this.runAgentLoop();
  }

  /** Continue without new user input (e.g., after tool results) */
  async continue(): Promise<void> {
    await this.runAgentLoop();
  }

  /** Subscribe to agent events */
  subscribe(listener: AgentListener): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Inject a high-priority steering message before the next LLM call */
  steer(m: AgentMessage): void {
    this.steeringQueue.enqueue(m);
  }

  /** Enqueue a follow-up message for after the current turn */
  followUp(m: AgentMessage): void {
    this.followUpQueue.enqueue(m);
  }

  /** Cancel the current streaming request */
  abort(): void {
    this.abortController?.abort();
    this._state.isStreaming = false;
    this.emitStateChanged();
  }

  /** Returns a promise that resolves when the agent is idle */
  waitForIdle(): Promise<void> {
    if (!this._state.isStreaming) return Promise.resolve();
    if (!this.idlePromise) {
      this.idlePromise = new Promise((resolve) => {
        this.idleResolve = resolve;
      });
    }
    return this.idlePromise;
  }

  /** Clear all messages and reset to initial state */
  reset(): void {
    this._state.messages = [];
    this._state.isStreaming = false;
    this._state.errorMessage = "";
    this._state.pendingToolCalls.clear();
    this.emitStateChanged();
  }

  /** Get an immutable snapshot of current state */
  state(): AgentState {
    return this._state.snapshot();
  }

  // ----- Private: The Agent Loop -----

  private async runAgentLoop(): Promise<void> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // Outer loop: keeps running if followUpQueue has items
      do {
        // 1. Drain steering queue → inject into messages
        for (const msg of this.steeringQueue.drain()) {
          this._state.pushMessage(msg);
        }

        // 2. Build the LLM context
        let context: Context = {
          systemPrompt: this._state.systemPrompt,
          messages: this._state.messages,
          tools: this._state.tools,
        };
        context = this.transformContext(context);

        // 3. Call the LLM via streamFn
        this._state.isStreaming = true;
        this.emit({ kind: "stream-start" });

        const rawStream = this.streamFn(this._state.model, context);
        const stream = new ProxyMessageEventStream(rawStream, (event) => {
          this.emit({ kind: "state-changed", payload: event });
        });

        // 4. Consume the stream
        let contentAccum = "";
        const toolCalls: ToolCallRecord[] = [];

        for await (const event of stream) {
          if (signal.aborted) break;

          if (event.type === "text-delta" && event.delta) {
            contentAccum += event.delta;
            this._state.streamingMessage = {
              role: "assistant",
              content: contentAccum,
            };
            this.emitStateChanged();
          }
        }

        // 5. Finalize the assistant message
        const assistantMsg = await stream.result();
        this._state.pushMessage({
          role: "assistant",
          content: assistantMsg.content,
          toolCalls: assistantMsg.toolCalls,
        });

        this._state.isStreaming = false;
        this.emit({ kind: "stream-end" });

        // 6. Execute any tool calls
        if (assistantMsg.toolCalls?.length) {
          await this.executeToolCalls(assistantMsg.toolCalls, signal);
        }

        // 7. Drain follow-up queue for the next iteration
        for (const msg of this.followUpQueue.drain()) {
          this._state.pushMessage(msg);
        }
      } while (this.followUpQueue.length > 0);
    } catch (err) {
      this._state.errorMessage = String(err);
      this._state.isStreaming = false;
      this.emit({ kind: "error", payload: err });
    } finally {
      // Signal idle waiters
      this.abortController = null;
      if (this.idleResolve) {
        this.idleResolve();
        this.idlePromise = null;
        this.idleResolve = null;
      }
    }
  }

  // ----- Private: Tool Execution -----

  private async executeToolCalls(
    calls: ToolCallRecord[],
    signal: AbortSignal,
  ): Promise<void> {
    for (const call of calls) {
      if (signal.aborted) break;

      const tool = this._state.tools.find((t) => t.name === call.name);
      if (!tool) {
        this._state.pushMessage({
          role: "tool",
          toolCallId: call.id,
          result: { success: false, output: "", error: `Unknown tool: ${call.name}` },
        });
        continue;
      }

      this._state.pendingToolCalls.add(call.id);
      this.emit({ kind: "tool-call-start", payload: call });

      try {
        // Before hook — can modify args or skip (return null)
        const preparedArgs = tool.prepareArguments(call.arguments);
        const hookResult = await this.beforeToolCall(tool, preparedArgs);
        if (hookResult === null) {
          this._state.pendingToolCalls.delete(call.id);
          continue; // skip this tool call
        }

        // Execute
        let result = await tool.execute(
          call.id,
          hookResult as any,
          signal,
          (progress) => this.emit({ kind: "state-changed", payload: progress }),
        );

        // After hook — can modify result
        result = await this.afterToolCall(tool, result);

        // Push tool result message
        this._state.pushMessage({
          role: "tool",
          toolCallId: call.id,
          result,
        });
      } catch (err) {
        this._state.pushMessage({
          role: "tool",
          toolCallId: call.id,
          result: { success: false, output: "", error: String(err) },
        });
      } finally {
        this._state.pendingToolCalls.delete(call.id);
        this.emit({ kind: "tool-call-end", payload: call });
      }
    }

    // After tools finish, continue the agent loop so the LLM
    // can see the tool results
    // (The do-while in runAgentLoop handles this)
  }

  // ----- Private: Event Emission -----

  private emit(partial: { kind: AgentEventKind; payload?: unknown }): void {
    const event: AgentEvent = {
      kind: partial.kind,
      timestamp: Date.now(),
      payload: partial.payload,
      reconstruct: () => ({
        role: "assistant" as const,
        content: this._state.streamingMessage?.role === "assistant"
          ? (this._state.streamingMessage as any).content
          : "",
      }),
    };
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private emitStateChanged(): void {
    this.emit({ kind: "state-changed" });
  }
}

// ============================================================
// EXAMPLE: Define a concrete tool
// ============================================================

const bashTool: AgentTool<{ command: string }> = {
  name: "bash",
  label: "Run Command",
  description: "Execute a bash command and return stdout/stderr",
  parameters: { command: "string" } as any,

  prepareArguments(args: unknown): { command: string } {
    const a = args as Record<string, unknown>;
    if (typeof a.command !== "string") {
      throw new Error("bash tool requires a `command` string");
    }
    return { command: a.command };
  },

  async execute(id, params, signal, cb) {
    cb(`Running: ${params.command}`);
    // Stub: would spawn a child process here
    return {
      success: true,
      output: `$ ${params.command}\n(simulated output)`,
    };
  },
};

// ============================================================
// EXAMPLE USAGE
// ============================================================

async function main() {
  // Fake stream function (simulates LLM response)
  const fakeStreamFn: StreamFn = (model, context) => {
    const stream = new (class extends AssistantMessageEventStream {
      private _result: Promise<AssistantMessage>;
      private _resolve!: (msg: AssistantMessage) => void;

      constructor() {
        super();
        this._result = new Promise((r) => (this._resolve = r));

        // Simulate async streaming
        setTimeout(() => this.push({ type: "text-delta", delta: "Let me " }), 10);
        setTimeout(() => this.push({ type: "text-delta", delta: "run that." }), 20);
        setTimeout(() => {
          this.push({ type: "done" });
          this.end({ role: "assistant", content: "Let me run that." });
        }, 30);
      }

      push(e: AssistantMessageEvent) { this.queue.push(e); }
      end(r?: AssistantMessage) {
        this.done = true;
        if (r) this._resolve(r);
      }
      result() { return this._result; }
      [Symbol.asyncIterator](): AsyncIterator<AssistantMessageEvent> {
        let i = 0;
        return {
          next: async () => {
            // Wait for events to arrive
            while (i >= this.queue.length && !this.done) {
              await new Promise((r) => setTimeout(r, 5));
            }
            if (i >= this.queue.length) return { value: undefined as any, done: true };
            return { value: this.queue[i++], done: false };
          },
        };
      }
    })();
    return stream;
  };

  // Create the agent
  const agent = new Agent({
    model: {
      id: "claude-sonnet-4-20250514",
      api: "anthropic",
      provider: "anthropic",
      reasoning: true,
      cost: { inputPerToken: 0.003, outputPerToken: 0.015 },
      contextWindow: 200_000,
    },
    systemPrompt: "You are a helpful coding assistant.",
    tools: [bashTool],
    streamFn: fakeStreamFn,
    beforeToolCall: async (tool, args) => {
      console.log(`[hook] Before ${tool.name}:`, args);
      return args; // pass through
    },
    afterToolCall: async (tool, result) => {
      console.log(`[hook] After ${tool.name}:`, result.output);
      return result; // pass through
    },
  });

  // Subscribe to events
  agent.subscribe((event) => {
    if (event.kind === "stream-start") console.log("--- streaming ---");
    if (event.kind === "stream-end") console.log("--- done ---");
  });

  // Send a prompt
  await agent.prompt("Run `ls -la` for me");

  // Inspect final state
  const snap = agent.state();
  console.log(`Messages: ${snap.messages.length}`);
  console.log(`Streaming: ${snap.isStreaming}`);
}

main().catch(console.error);

```