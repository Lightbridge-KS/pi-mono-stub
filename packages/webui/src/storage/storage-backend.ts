// ------------------------------------------------------------
// StorageBackend — pluggable persistence
// ------------------------------------------------------------

export interface StorageBackend {
  get(k: string): Promise<unknown>;
  set(k: string, v: unknown): Promise<void>;
  delete(k: string): Promise<void>;
}
