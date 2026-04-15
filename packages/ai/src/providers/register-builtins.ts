import type { ApiProvider } from "../api-registry.js";
import type { Model } from "../types.js";
import { AssistantMessageEventStream } from "../utils/event-stream.js";

// --- Anthropic provider ---

export const anthropicProvider: ApiProvider<"anthropic"> = {
  api: "anthropic",

  stream(_model, _context, _options) {
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

  streamSimple(model, context, options) {
    return this.stream(model, context, options);
  },
};

// --- Model descriptor ---

export const claude: Model<"anthropic"> = {
  id: "claude-sonnet-4-20250514",
  api: "anthropic",
  provider: "anthropic",
  reasoning: true,
  cost: { inputPerToken: 0.003, outputPerToken: 0.015 },
  contextWindow: 200_000,
};
