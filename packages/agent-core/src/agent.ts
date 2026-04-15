import type { Context, Message, Model } from "@pi-mono-stub/ai";
import { ProxyMessageEventStream } from "./proxy.js";
import type {
  AfterToolCallHook,
  AgentEvent,
  AgentEventKind,
  AgentListener,
  AgentMessage,
  AgentState,
  AgentTool,
  BeforeToolCallHook,
  ConvertFn,
  QueueMode,
  StreamFn,
  ToolCallRecord,
  TransformFn,
  Unsubscribe,
} from "./types.js";

// ------------------------------------------------------------
// MutableAgentState — internal mutable state w/ copy-on-assign
// ------------------------------------------------------------

export class MutableAgentState {
  private _tools: AgentTool[] = [];
  private _messages: AgentMessage[] = [];

  systemPrompt = "";
  model!: Model;
  thinkingLevel = "normal";
  isStreaming = false;
  streamingMessage: AgentMessage = { role: "assistant", content: "" };
  pendingToolCalls = new Set<string>();
  errorMessage = "";

  /** Copy-on-read: returns a shallow copy */
  get tools(): AgentTool[] {
    return [...this._tools];
  }
  set tools(value: AgentTool[]) {
    this._tools = [...value]; // defensive copy
  }

  /** Copy-on-read: returns a shallow copy */
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
      tools: this.tools,       // already copied by getter
      messages: this.messages, // already copied by getter
      isStreaming: this.isStreaming,
      streamingMessage: this.streamingMessage,
      pendingToolCalls: new Set(this.pendingToolCalls),
      errorMessage: this.errorMessage,
    };
  }
}

// ------------------------------------------------------------
// PendingMessageQueue — buffered message injection
// ------------------------------------------------------------
//
//  Two queues exist on the Agent:
//    - steeringQueue  → high-priority, injected before next turn
//    - followUpQueue  → enqueued for after current turn completes
//

export class PendingMessageQueue {
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
// Agent — the central orchestrator
// ------------------------------------------------------------
//
//  Lifecycle of a single turn:
//
//    prompt(m) / continue() / followUp(m)
//         │
//         ▼
//    ┌─ drain steeringQueue ──┐
//    │  build Context         │
//    │  transformContext()    │
//    │  streamFn(model, ctx)  │ ← calls LLM
//    │         │              │
//    │    for await (event)   │
//    │      ├─ text-delta     │ → emit AgentEvent, build message
//    │      └─ tool-call      │ → beforeToolCall → execute → afterToolCall
//    │         │              │
//    │    stream ends         │
//    │  push AssistantMessage │
//    │  drain followUpQueue   │ → loop if non-empty
//    └────────────────────────┘
//

export interface AgentConfig {
  model: Model;
  systemPrompt: string;
  tools?: AgentTool[];
  streamFn: StreamFn;
  convertToLlm?: ConvertFn;
  transformContext?: TransformFn;
  beforeToolCall?: BeforeToolCallHook;
  afterToolCall?: AfterToolCallHook;
}

export class Agent {
  private _state: MutableAgentState;
  private listeners = new Set<AgentListener>();
  private steeringQueue: PendingMessageQueue;
  private followUpQueue: PendingMessageQueue;
  private abortController: AbortController | null = null;
  private idlePromise: Promise<void> | null = null;
  private idleResolve: (() => void) | null = null;

  // Pluggable functions & hooks
  streamFn: StreamFn;
  convertToLlm: ConvertFn;
  transformContext: TransformFn;
  beforeToolCall: BeforeToolCallHook;
  afterToolCall: AfterToolCallHook;

  constructor(config: AgentConfig) {
    this._state = new MutableAgentState();
    this._state.model = config.model;
    this._state.systemPrompt = config.systemPrompt;
    this._state.tools = config.tools ?? [];

    this.steeringQueue = new PendingMessageQueue("fifo");
    this.followUpQueue = new PendingMessageQueue("fifo");

    this.streamFn = config.streamFn;
    this.convertToLlm = config.convertToLlm ?? ((msgs) => msgs);
    this.transformContext = config.transformContext ?? ((ctx) => ctx);
    this.beforeToolCall =
      config.beforeToolCall ?? (async (_t, args) => args);
    this.afterToolCall = config.afterToolCall ?? (async (_t, res) => res);
  }

  // ----- Public API -----

  /** Start a new turn with a user message */
  async prompt(m: string, images?: string[]): Promise<void> {
    const userMsg: AgentMessage =
      images !== undefined
        ? { role: "user", content: m, images }
        : { role: "user", content: m };
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
    return () => {
      this.listeners.delete(listener);
    };
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

  // ----- Private: the agent loop -----

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

        // 2. Build the LLM context.
        //    AgentMessage is a structural subtype of pi-ai's Message
        //    (extra optional fields are compatible), so we cast through
        //    unknown to satisfy TS's strict mode without runtime cost.
        let context: Context = {
          systemPrompt: this._state.systemPrompt,
          messages: this._state.messages as unknown as Message[],
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
        const toolCalls = assistantMsg.toolCalls;
        this._state.pushMessage(
          toolCalls !== undefined
            ? {
                role: "assistant",
                content: assistantMsg.content,
                toolCalls,
              }
            : { role: "assistant", content: assistantMsg.content },
        );

        this._state.isStreaming = false;
        this.emit({ kind: "stream-end" });

        // 6. Execute any tool calls
        if (toolCalls?.length) {
          await this.executeToolCalls(toolCalls, signal);
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
      this.abortController = null;
      if (this.idleResolve) {
        this.idleResolve();
        this.idlePromise = null;
        this.idleResolve = null;
      }
    }
  }

  // ----- Private: tool execution -----

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
          result: {
            success: false,
            output: "",
            error: `Unknown tool: ${call.name}`,
          },
        });
        continue;
      }

      this._state.pendingToolCalls.add(call.id);
      this.emit({ kind: "tool-call-start", payload: call });

      try {
        // Before hook — can modify args or skip (return null)
        const preparedArgs = tool.prepareArguments(call.arguments);
        const hookResult = await this.beforeToolCall(
          tool,
          preparedArgs as Record<string, unknown>,
        );
        if (hookResult === null) {
          this._state.pendingToolCalls.delete(call.id);
          continue; // skip this tool call
        }

        // Execute
        let result = await tool.execute(
          call.id,
          hookResult,
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
  }

  // ----- Private: event emission -----

  private emit(partial: {
    kind: AgentEventKind;
    payload?: unknown;
  }): void {
    const streaming = this._state.streamingMessage;
    const event: AgentEvent = {
      kind: partial.kind,
      timestamp: Date.now(),
      payload: partial.payload,
      reconstruct: () => ({
        role: "assistant" as const,
        content: streaming.role === "assistant" ? streaming.content : "",
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
