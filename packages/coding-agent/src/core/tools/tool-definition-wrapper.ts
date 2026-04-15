import type { AgentTool, AgentToolResult } from "@pi-mono-stub/agent-core";

// ------------------------------------------------------------
// ToolDefinition — declarative, user-facing tool schema
// ------------------------------------------------------------
//
//  A clean, user-facing way to define tools using a TypeBox-like
//  schema for parameter validation. Gets wrapped into an AgentTool
//  via `wrapToolDefinition()`, which adapts the declarative shape
//  into the imperative interface expected by pi-agent-core.
//

/** Placeholder for a TypeBox schema value */
export type TypeBox = Record<string, unknown>;

export interface ToolResult<TDetails = unknown> {
  success: boolean;
  output: string;
  details?: TDetails;
}

export interface ToolDefinition<
  T = Record<string, unknown>,
  TDetails = unknown,
> {
  name: string;
  description: string;
  parameters: TypeBox;
  execute(params: T): Promise<ToolResult<TDetails>>;
}

// ------------------------------------------------------------
// wrapToolDefinition() — ToolDefinition → AgentTool
// ------------------------------------------------------------

export function wrapToolDefinition<T, TDetails>(
  def: ToolDefinition<T, TDetails>,
): AgentTool {
  return {
    name: def.name,
    label: def.name,
    description: def.description,
    parameters: def.parameters,

    prepareArguments(args: unknown): Record<string, unknown> {
      // Stub: real impl would validate `args` against def.parameters
      return args as Record<string, unknown>;
    },

    async execute(_id, params, _signal, cb): Promise<AgentToolResult> {
      cb(`Executing ${def.name}...`);
      const result = await def.execute(params as T);
      return result.success
        ? { success: true, output: result.output }
        : { success: false, output: result.output, error: result.output };
    },
  };
}
