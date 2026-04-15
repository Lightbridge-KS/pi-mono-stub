// ------------------------------------------------------------
// SettingsManager — key-value user preferences
// ------------------------------------------------------------

export class SettingsManager {
  private store = new Map<string, unknown>();

  get(key: string): unknown {
    return this.store.get(key);
  }

  set(key: string, val: unknown): void {
    this.store.set(key, val);
  }

  async save(): Promise<void> {
    // Stub: would serialize to ~/.pi/settings.json
    const data = Object.fromEntries(this.store);
    console.log("[settings] saved:", JSON.stringify(data));
  }
}
