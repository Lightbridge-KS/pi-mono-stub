// ------------------------------------------------------------
// Key input & binding types
// ------------------------------------------------------------

export interface KeyData {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

export interface KeyBinding {
  action: string;
  key: KeyData;
  description?: string;
}

export type Action = string;

// ------------------------------------------------------------
// KeybindingsManager — maps key input → named actions
// ------------------------------------------------------------

export class KeybindingsManager {
  private bindings = new Map<string, KeyBinding>();

  constructor(defaults: KeyBinding[] = []) {
    for (const b of defaults) {
      this.bindings.set(b.action, b);
    }
  }

  /** Look up the binding for a named action */
  get(action: string): KeyBinding {
    const binding = this.bindings.get(action);
    if (!binding) throw new Error(`No binding for action "${action}"`);
    return binding;
  }

  /** Given raw key input, find the matching action (if any) */
  match(key: KeyData): Action | undefined {
    for (const [action, binding] of this.bindings) {
      if (
        binding.key.key === key.key &&
        !!binding.key.ctrl === !!key.ctrl &&
        !!binding.key.meta === !!key.meta
      ) {
        return action;
      }
    }
    return undefined;
  }
}
