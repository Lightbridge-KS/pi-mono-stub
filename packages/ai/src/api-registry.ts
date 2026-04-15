import type { Context, Model } from "./types.js";
import type { AssistantMessageEventStream } from "./utils/event-stream.js";

// ------------------------------------------------------------
// StreamFunction & ApiProvider<TApi, TOptions>
// ------------------------------------------------------------

export type StreamFunction = (
  model: Model,
  context: Context,
  options?: Record<string, unknown>,
) => AssistantMessageEventStream;

export interface ApiProvider<
  TApi extends string = string,
  TOptions = Record<string, unknown>,
> {
  api: TApi;
  stream: StreamFunction;
  streamSimple: StreamFunction;
  // Phantom to keep TOptions parameter in the interface shape.
  // Providers may narrow this to their own options type.
  _options?: TOptions;
}

// ------------------------------------------------------------
// Registry — stores and resolves ApiProviders
// ------------------------------------------------------------

export class Registry {
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
