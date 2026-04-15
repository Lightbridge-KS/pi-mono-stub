import { anthropicProvider, claude } from "@pi-mono-stub/ai";
import { Agent, type AgentTool } from "@pi-mono-stub/agent-core";

// ------------------------------------------------------------
// Example tool — a stubbed bash executor
// ------------------------------------------------------------

const bashTool: AgentTool<{ command: string }> = {
  name: "bash",
  label: "Run Command",
  description: "Execute a bash command and return stdout/stderr",
  // The stub's `parameters` holds a schema-ish object; in a real tool
  // this would be a JSON Schema. We cast through unknown so the value
  // satisfies the generic `TParams & Record<string, unknown>` shape.
  parameters: { command: "string" } as unknown as { command: string } & Record<
    string,
    unknown
  >,

  prepareArguments(args: unknown): { command: string } {
    const a = args as Record<string, unknown>;
    if (typeof a.command !== "string") {
      throw new Error("bash tool requires a `command` string");
    }
    return { command: a.command };
  },

  async execute(_id, params, _signal, cb) {
    cb(`Running: ${params.command}`);
    // Stub: would spawn a child process here
    return {
      success: true,
      output: `$ ${params.command}\n(simulated output)`,
    };
  },
};

// ------------------------------------------------------------
// Wire the Agent to pi-ai's Anthropic stub provider
// ------------------------------------------------------------

async function main(): Promise<void> {
  const agent = new Agent({
    model: claude,
    systemPrompt: "You are a helpful coding assistant.",
    tools: [bashTool],
    // pi-ai's `ApiProvider.stream` is structurally a `StreamFn` — just
    // bind `this` so method dispatch still works.
    streamFn: anthropicProvider.stream.bind(anthropicProvider),
    beforeToolCall: async (tool, args) => {
      console.log(`[hook] Before ${tool.name}:`, args);
      return args;
    },
    afterToolCall: async (tool, result) => {
      console.log(`[hook] After ${tool.name}:`, result.output);
      return result;
    },
  });

  agent.subscribe((event) => {
    if (event.kind === "stream-start") console.log("--- streaming ---");
    if (event.kind === "stream-end") console.log("--- done ---");
  });

  await agent.prompt("Run `ls -la` for me");

  const snap = agent.state();
  console.log(`Messages: ${snap.messages.length}`);
  console.log(`Streaming: ${snap.isStreaming}`);
  console.log(`Last message:`, snap.messages.at(-1));
}

main().catch(console.error);
