import {
  AssistantMessageEventStream,
  type AssistantMessage,
  type AssistantMessageEvent,
} from "@pi-mono-stub/ai";

// ------------------------------------------------------------
// ProxyMessageEventStream
// ------------------------------------------------------------
//
//  Wraps an underlying AssistantMessageEventStream so the Agent can
//  observe every event (for emitting AgentEvents) while still handing
//  the original stream contract to downstream consumers.
//
//  Design note: the real pi-ai `AssistantMessageEventStream` has
//  private `queue`/`done`, so the proxy does not maintain its own
//  queue — it simply *delegates* to the source stream. This is how
//  the real pi-agent-core `ProxyMessageEventStream` works too.
//

export class ProxyMessageEventStream extends AssistantMessageEventStream {
  constructor(
    private source: AssistantMessageEventStream,
    private onEvent?: (e: AssistantMessageEvent) => void,
  ) {
    super();
  }

  override result(): Promise<AssistantMessage> {
    return this.source.result();
  }

  override async *[Symbol.asyncIterator](): AsyncIterator<AssistantMessageEvent> {
    for await (const event of this.source) {
      this.onEvent?.(event);
      yield event;
    }
  }
}
