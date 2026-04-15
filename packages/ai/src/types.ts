// ------------------------------------------------------------
// Message (Union Type)
// ------------------------------------------------------------

export interface UserMessage {
  role: "user";
  content: string;
}

export interface AssistantMessage {
  role: "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolResultMessage {
  role: "tool";
  toolCallId: string;
  result: unknown;
}

/** Union of all message types flowing through the system */
export type Message = UserMessage | AssistantMessage | ToolResultMessage;

// ------------------------------------------------------------
// Supporting Types
// ------------------------------------------------------------

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface CostTable {
  inputPerToken: number;
  outputPerToken: number;
}

/** Events emitted while streaming an assistant response */
export interface AssistantMessageEvent {
  type: "text-delta" | "tool-call-delta" | "done";
  delta?: string;
}

// ------------------------------------------------------------
// Context
// ------------------------------------------------------------

export interface Context {
  systemPrompt?: string;
  messages: Message[];
  tools?: Tool[];
}

// ------------------------------------------------------------
// Model<TApi>
// ------------------------------------------------------------

export interface Model<TApi extends string = string> {
  id: string;
  api: TApi;
  provider: string;
  reasoning: boolean;
  cost: CostTable;
  contextWindow: number;
}
