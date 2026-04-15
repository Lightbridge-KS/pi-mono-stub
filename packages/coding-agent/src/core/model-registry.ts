import type { Model } from "@pi-mono-stub/ai";

// ------------------------------------------------------------
// ModelRegistry — auth + provider management
// ------------------------------------------------------------

export interface AuthStorage {
  getKey(provider: string): string | undefined;
  setKey(provider: string, key: string): void;
}

export interface AuthInfo {
  apiKey: string;
  headers: Record<string, string>;
}

export interface ProviderConfig {
  baseUrl: string;
  models: string[];
  authType: "api-key" | "oauth";
}

export class ModelRegistry {
  private providers = new Map<string, ProviderConfig>();

  constructor(private auth: AuthStorage) {}

  getApiKeyAndHeaders(model: Model): AuthInfo {
    const key = this.auth.getKey(model.provider);
    if (!key) {
      throw new Error(
        `No API key for provider "${model.provider}". ` +
          `Run: pi auth login ${model.provider}`,
      );
    }
    return {
      apiKey: key,
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Model-Id": model.id,
      },
    };
  }

  isUsingOAuth(provider: string): boolean {
    return this.providers.get(provider)?.authType === "oauth";
  }

  registerProvider(name: string, config: ProviderConfig): void {
    this.providers.set(name, config);
  }

  unregisterProvider(name: string): void {
    this.providers.delete(name);
  }
}
