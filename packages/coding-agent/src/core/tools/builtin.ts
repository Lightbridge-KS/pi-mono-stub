import type { ToolDefinition } from "./tool-definition-wrapper.js";

export const bashToolDef: ToolDefinition<
  { command: string },
  { exitCode: number }
> = {
  name: "bash",
  description: "Execute a shell command",
  parameters: {
    type: "object",
    properties: { command: { type: "string" } },
  },
  async execute(params) {
    // Stub: would spawn a child process here
    return {
      success: true,
      output: `$ ${params.command}\n(output)`,
      details: { exitCode: 0 },
    };
  },
};

export const readFileToolDef: ToolDefinition<
  { path: string; range?: [number, number] },
  { lineCount: number }
> = {
  name: "read_file",
  description: "Read a file from disk",
  parameters: {
    type: "object",
    properties: { path: { type: "string" } },
  },
  async execute(params) {
    // Stub: would read from the filesystem
    return {
      success: true,
      output: `(contents of ${params.path})`,
      details: { lineCount: 42 },
    };
  },
};

export const writeFileToolDef: ToolDefinition<
  { path: string; content: string },
  { bytesWritten: number }
> = {
  name: "write_file",
  description: "Write content to a file",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" },
    },
  },
  async execute(params) {
    return {
      success: true,
      output: `Wrote ${params.path}`,
      details: { bytesWritten: params.content.length },
    };
  },
};
