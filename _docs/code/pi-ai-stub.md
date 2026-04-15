# `pi-ai` Stub

```ts
// ============================================================
// pi-ai Architecture — Stub Implementation
// ============================================================

// ------------------------------------------------------------
// 1. Message (Union Type)
// ------------------------------------------------------------

interface UserMessage {
  role: "user";
  content: string;
}

interface AssistantMessage {
  role: "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

interface ToolResultMessage {
  role: "tool";
  toolCallId: string;
  result: unknown;
}

/** Union of all message types flowing through the system */
type Message = UserMessage | AssistantMessage | ToolResultMessage;

// ------------------------------------------------------------
// 2. Supporting Types
// ------------------------------------------------------------

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface CostTable {
  inputPerToken: number;
  outputPerToken: number;
}

/** Events emitted while streaming an assistant response */
interface AssistantMessageEvent {
  type: "text-delta" | "tool-call-delta" | "done";
  delta?: string;
}

// ------------------------------------------------------------
// 3. Context (Interface)
// ------------------------------------------------------------

interface Context {
  systemPrompt?: string;
  messages: Message[];
  tools?: Tool[];
}

// ------------------------------------------------------------
// 4. Model<TApi> (Interface)
// ------------------------------------------------------------

interface Model<TApi extends string = string> {
  id: string;
  api: TApi;
  provider: string;
  reasoning: boolean;
  cost: CostTable;
  contextWindow: number;
}

// ------------------------------------------------------------
// 5. EventStream<T, R> — Generic async-iterable stream
// ------------------------------------------------------------
//
//  Producers call:   push(event)  → enqueue an event
//                    end(result?) → signal completion
//
//  Consumers use:    for await (const event of stream) { ... }
//                    const final = await stream.result();
//

class EventStream<T, R> {
  // --- private state ---
  private queue: T[] = [];
  private done: boolean = false;
  private finalResultPromise: Promise<R>;

  private resolveResult!: (value: R) => void;
  private waiting: ((value: IteratorResult<T>) => void) | null = null;

  constructor() {
    this.finalResultPromise = new Promise<R>((resolve) => {
      this.resolveResult = resolve;
    });
  }

  // --- public API ---

  /** Enqueue an event for consumers */
  push(event: T): void {
    if (this.done) return;

    // If a consumer is already waiting, deliver immediately
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = null;
      resolve({ value: event, done: false });
    } else {
      this.queue.push(event);
    }
  }

  /** Signal that the stream is complete */
  end(result?: R): void {
    this.done = true;

    // Resolve the final-result promise
    this.resolveResult(result as R);

    // If a consumer is waiting, tell it we're done
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = null;
      resolve({ value: undefined as any, done: true });
    }
  }

  /** Await the final aggregated result after the stream ends */
  result(): Promise<R> {
    return this.finalResultPromise;
  }

  /** Makes the stream usable with  `for await...of` */
  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        // Drain buffered events first
        if (this.queue.length > 0) {
          return Promise.resolve({
            value: this.queue.shift()!,
            done: false,
          });
        }
        // Stream already finished
        if (this.done) {
          return Promise.resolve({
            value: undefined as any,
            done: true,
          });
        }
        // Park until push() or end() is called
        return new Promise((resolve) => {
          this.waiting = resolve;
        });
      },
    };
  }
}

// ------------------------------------------------------------
// 6. AssistantMessageEventStream
//    — Concrete stream: pushes events, resolves a full message
// ------------------------------------------------------------

class AssistantMessageEventStream extends EventStream<
  AssistantMessageEvent,  // T  — events pushed during streaming
  AssistantMessage         // R  — final aggregated result
> {}

// ------------------------------------------------------------
// 7. StreamFunction & ApiProvider<TApi, TOptions> (Interface)
// ------------------------------------------------------------

type StreamFunction = (
  model: Model,
  context: Context,
  options?: Record<string, unknown>
) => AssistantMessageEventStream;

interface ApiProvider<
  TApi extends string = string,
  TOptions = Record<string, unknown>
> {
  api: TApi;
  stream: StreamFunction;
  streamSimple: StreamFunction;
}

// ------------------------------------------------------------
// 8. Registry — Stores and resolves ApiProviders
// ------------------------------------------------------------

class Registry {
  private providers = new Map<string, ApiProvider>();

  registerApiProvider(p: ApiProvider): void {
    this.providers.set(p.api, p);
  }

  getApiProvider(api: string): ApiProvider {
    const provider = this.providers.get(api);
    if (!provider) {
      throw new Error(`No provider registered for api "${api}"`);
    }
    return provider;
  }

  resolveApiProvider(api: string): ApiProvider {
    // Could add fallback / alias logic here
    return this.getApiProvider(api);
  }
}

// ============================================================
// EXAMPLE USAGE
// ============================================================

// --- Define a concrete provider (e.g. Anthropic) ---

const anthropicProvider: ApiProvider<"anthropic"> = {
  api: "anthropic",

  stream(model, context, _options) {
    const eventStream = new AssistantMessageEventStream();

    // Simulate async streaming from an API
    setTimeout(() => {
      eventStream.push({ type: "text-delta", delta: "Hello, " });
    }, 50);
    setTimeout(() => {
      eventStream.push({ type: "text-delta", delta: "world!" });
    }, 100);
    setTimeout(() => {
      eventStream.push({ type: "done" });
      eventStream.end({
        role: "assistant",
        content: "Hello, world!",
      });
    }, 150);

    return eventStream;
  },

  streamSimple(model, context, _options) {
    return this.stream(model, context, _options);
  },
};

// --- Define a model descriptor ---

const claude: Model<"anthropic"> = {
  id: "claude-sonnet-4-20250514",
  api: "anthropic",
  provider: "anthropic",
  reasoning: true,
  cost: { inputPerToken: 0.003, outputPerToken: 0.015 },
  contextWindow: 200_000,
};

// --- Wire it all together ---

async function main() {
  // 1. Registry setup
  const registry = new Registry();
  registry.registerApiProvider(anthropicProvider);

  // 2. Build a Context
  const context: Context = {
    systemPrompt: "You are a helpful assistant.",
    messages: [{ role: "user", content: "Say hello!" }],
    tools: [],
  };

  // 3. Resolve the provider and stream
  const provider = registry.resolveApiProvider(claude.api);
  const stream = provider.stream(claude, context);

  // 4. Consume events as they arrive
  for await (const event of stream) {
    if (event.type === "text-delta") {
      process.stdout.write(event.delta ?? "");
    }
  }

  // 5. Get the final assembled message
  const finalMessage = await stream.result();
  console.log("\n\nFinal:", finalMessage);
}

main().catch(console.error);
```