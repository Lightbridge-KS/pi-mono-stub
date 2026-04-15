import type { StorageBackend } from "./storage-backend.js";

// ------------------------------------------------------------
// IndexedDBStorageBackend — browser-native StorageBackend impl
// ------------------------------------------------------------

export class IndexedDBStorageBackend implements StorageBackend {
  private dbName: string;
  private storeName: string;

  constructor(dbName: string, storeName: string = "kv") {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  async get(_k: string): Promise<unknown> {
    // Stub: tx → objectStore.get(k)
    return undefined;
  }

  async set(_k: string, _v: unknown): Promise<void> {
    // Stub: tx → objectStore.put(v, k)
  }

  async delete(_k: string): Promise<void> {
    // Stub: tx → objectStore.delete(k)
  }

  private async openDb(): Promise<IDBDatabase> {
    // Stub: open/create IndexedDB for `${this.dbName}` / `${this.storeName}`
    return {} as IDBDatabase;
  }
}
