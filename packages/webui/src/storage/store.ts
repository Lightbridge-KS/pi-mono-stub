import type { StorageBackend } from "./storage-backend.js";

// ------------------------------------------------------------
// Store — typed wrapper around a StorageBackend
// ------------------------------------------------------------
//
//  Template Method pattern: subclasses provide `getConfig()` (prefix
//  + version) and inherit the `read`/`write`/`remove` helpers.
//

export interface StoreConfig {
  prefix: string;
  version: number;
}

export abstract class Store {
  private backend!: StorageBackend;

  setBackend(b: StorageBackend): void {
    this.backend = b;
  }

  abstract getConfig(): StoreConfig;

  protected async read(key: string): Promise<unknown> {
    const cfg = this.getConfig();
    return this.backend.get(`${cfg.prefix}:${key}`);
  }

  protected async write(key: string, value: unknown): Promise<void> {
    const cfg = this.getConfig();
    return this.backend.set(`${cfg.prefix}:${key}`, value);
  }

  protected async remove(key: string): Promise<void> {
    const cfg = this.getConfig();
    return this.backend.delete(`${cfg.prefix}:${key}`);
  }
}
