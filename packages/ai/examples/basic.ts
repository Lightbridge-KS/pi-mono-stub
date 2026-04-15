import {
  anthropicProvider,
  claude,
  Registry,
  type Context,
} from "@pi-mono-stub/ai";

async function main(): Promise<void> {
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
