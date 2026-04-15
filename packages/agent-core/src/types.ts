import type {
  AssistantMessage,
  AssistantMessageEventStream,
  Context,
  Model,
  Tool,
} from "@pi-mono-stub/ai";

// ------------------------------------------------------------
// AgentMessage — messages within the agent loop
// ------------------------------------------------------------

export type AgentMessage =
  | { role: "user"; content: string; images?: string[] }
  | { role: "assistant"; content: string; toolCalls?: ToolCallRecord[] }
  | { role: "tool"; toolCallId: string; result: AgentToolResult };

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ------------------------------------------------------------
// AgentToolResult
// ------------------------------------------------------------

export interface AgentToolResult {
  success: boolean;
  output: string;
  error?: string;
}

// ------------------------------------------------------------
// AgentState — immutable snapshot returned by Agent.state()
// ------------------------------------------------------------

export interface AgentState {
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
// StreamFn — the function that calls the LLM
// ------------------------------------------------------------
//
// Structurally identical to pi-ai's `StreamFunction`, so any
// `ApiProvider.stream` from pi-ai is a valid `StreamFn` value.

export type StreamFn = (
  model: Model,
  context: Context,
  options?: Record<string, unknown>,
) => AssistantMessageEventStream;

// ------------------------------------------------------------
// AgentTool — extends pi-ai's Tool with execute & prepareArguments
// ------------------------------------------------------------

export interface AgentTool<TParams = Record<string, unknown>> extends Tool {
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
// Hooks — intercept tool execution and context conversion
// ------------------------------------------------------------

export type BeforeToolCallHook = (
  tool: AgentTool,
  args: Record<string, unknown>,
) => Promise<Record<string, unknown> | null>;
// Return null to skip the tool call entirely.

export type AfterToolCallHook = (
  tool: AgentTool,
  result: AgentToolResult,
) => Promise<AgentToolResult>;

export type ConvertFn = (messages: AgentMessage[]) => unknown[];
export type TransformFn = (context: Context) => Context;

// ------------------------------------------------------------
// AgentEvent — events emitted to subscribers
// ------------------------------------------------------------

export type AgentEventKind =
  | "state-changed"
  | "message-added"
  | "tool-call-start"
  | "tool-call-end"
  | "stream-start"
  | "stream-end"
  | "error";

export interface AgentEvent {
  kind: AgentEventKind;
  timestamp: number;
  payload?: unknown;

  /** Reconstruct the full AssistantMessage from accumulated events */
  reconstruct(): AssistantMessage;
}

export type AgentListener = (event: AgentEvent) => void;
export type Unsubscribe = () => void;

// ------------------------------------------------------------
// QueueMode — used by PendingMessageQueue
// ------------------------------------------------------------

export type QueueMode = "fifo" | "lifo" | "replace";
