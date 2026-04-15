import { Store, type StoreConfig } from "./store.js";
import type { StorageBackend } from "./storage-backend.js";

// ------------------------------------------------------------
// Concrete Stores
// ------------------------------------------------------------

export class SettingsStore extends Store {
  getConfig(): StoreConfig {
    return { prefix: "settings", version: 1 };
  }

  async getTheme(): Promise<string> {
    return ((await this.read("theme")) as string | undefined) ?? "dark";
  }

  async setTheme(t: string): Promise<void> {
    return this.write("theme", t);
  }
}

export class ProviderKeysStore extends Store {
  getConfig(): StoreConfig {
    return { prefix: "provider-keys", version: 1 };
  }

  async getKey(provider: string): Promise<string | undefined> {
    return (await this.read(provider)) as string | undefined;
  }

  async setKey(provider: string, key: string): Promise<void> {
    return this.write(provider, key);
  }
}

export class SessionsStore extends Store {
  getConfig(): StoreConfig {
    return { prefix: "sessions", version: 1 };
  }

  async getSession(id: string): Promise<unknown> {
    return this.read(id);
  }

  async saveSession(id: string, data: unknown): Promise<void> {
    return this.write(id, data);
  }
}

export class CustomProvidersStore extends Store {
  getConfig(): StoreConfig {
    return { prefix: "custom-providers", version: 1 };
  }
}

// ------------------------------------------------------------
// AppStorage — aggregates all 4 stores behind one backend
// ------------------------------------------------------------

export class AppStorage {
  settings: SettingsStore;
  providerKeys: ProviderKeysStore;
  sessions: SessionsStore;
  customProviders: CustomProvidersStore;

  constructor(backend: StorageBackend) {
    this.settings = new SettingsStore();
    this.providerKeys = new ProviderKeysStore();
    this.sessions = new SessionsStore();
    this.customProviders = new CustomProvidersStore();

    // Inject the same backend into all stores
    this.settings.setBackend(backend);
    this.providerKeys.setBackend(backend);
    this.sessions.setBackend(backend);
    this.customProviders.setBackend(backend);
  }
}
