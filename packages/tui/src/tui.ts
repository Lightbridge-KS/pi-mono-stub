import type { Terminal } from "./terminal.js";
import { KeybindingsManager, type KeyData } from "./keybindings.js";

// ------------------------------------------------------------
// Component (Interface) — the core building block
// ------------------------------------------------------------
//
//  Every visual element implements this.
//  render() returns an array of strings (one per line).
//  handleInput() is optional — only interactive components
//  need it; returns true if the key was consumed.
//

export interface Component {
  render(width: number): string[];
  handleInput?(key: KeyData): boolean;
}

// ------------------------------------------------------------
// Focusable (Interface) — for components that receive focus
// ------------------------------------------------------------

export interface Focusable {
  onFocus(): void;
  onBlur(): void;
}

/** Type guard: does this component also implement Focusable? */
export function isFocusable(c: unknown): c is Focusable {
  return (
    typeof c === "object" &&
    c !== null &&
    "onFocus" in c &&
    "onBlur" in c
  );
}

// ------------------------------------------------------------
// OverlayHandle — dismissable overlay (modal, popup, etc.)
// ------------------------------------------------------------

export interface OverlayHandle {
  id: string;
  component: Component;
  dismiss(): void;
}

// ------------------------------------------------------------
// Container — composite component holding children
//   (Composite Pattern)
// ------------------------------------------------------------

export class Container implements Component {
  #children: Component[] = [];

  addChild(c: Component): void {
    this.#children.push(c);
  }

  removeChild(c: Component): void {
    const idx = this.#children.indexOf(c);
    if (idx !== -1) this.#children.splice(idx, 1);
  }

  render(width: number): string[] {
    // Stack all children's output vertically
    return this.#children.flatMap((child) => child.render(width));
  }

  handleInput(key: KeyData): boolean {
    // Propagate to children until one consumes the key
    for (const child of this.#children) {
      if (child.handleInput?.(key)) return true;
    }
    return false;
  }
}

// ------------------------------------------------------------
// TUI — the top-level orchestrator
// ------------------------------------------------------------
//
//  Owns the Terminal, manages focus, and drives the render loop.
//  Implements Component itself so it can be composed if needed.
//
//    TUI ◇──> Terminal       (composition — owns the terminal)
//    TUI ──> KeybindingsManager
//    TUI ──> Component       (implements)
//

export class TUI implements Component {
  private previousLines: string[] = [];
  private previousWidth: number = 0;
  private focused?: Component & Focusable;
  private overlays: OverlayHandle[] = [];

  private root: Container;
  private keybindings: KeybindingsManager;

  constructor(private terminal: Terminal) {
    this.root = new Container();
    this.keybindings = new KeybindingsManager([
      { action: "quit", key: { key: "c", ctrl: true } },
      { action: "submit", key: { key: "enter" } },
      { action: "focus-next", key: { key: "tab" } },
    ]);
  }

  // --- Public API ---

  render(width?: number): string[] {
    const w = width ?? this.terminal.columns;
    const lines = this.root.render(w);

    // Render overlays on top
    for (const overlay of this.overlays) {
      lines.push(...overlay.component.render(w));
    }
    return lines;
  }

  handleInput(key: KeyData): boolean {
    // 1. Check global keybindings first
    const action = this.keybindings.match(key);
    if (action === "quit") {
      this.stop();
      return true;
    }

    // 2. Delegate to focused component
    if (this.focused) {
      const consumed = this.focused.handleInput?.(key);
      if (consumed) return true;
    }

    // 3. Propagate to root container
    return this.root.handleInput(key);
  }

  start(): void {
    this.terminal.start();

    // Listen for key input (simplified)
    process.stdin.on("data", (data: Buffer) => {
      const keyData = this.parseKey(data);
      this.handleInput(keyData);
      this.renderToTerminal();
    });

    // Initial render
    this.renderToTerminal();
  }

  setFocus(c: Focusable): void {
    // Blur current
    if (this.focused) {
      this.focused.onBlur();
    }
    // Focus new
    this.focused = c as Component & Focusable;
    this.focused.onFocus();
  }

  /** Access the root container to add/remove children */
  getRoot(): Container {
    return this.root;
  }

  // --- Private helpers ---

  private stop(): void {
    this.terminal.stop();
    process.exit(0);
  }

  private renderToTerminal(): void {
    const width = this.terminal.columns;
    const lines = this.render(width);

    // Diff against previous render for minimal redraws
    if (
      width !== this.previousWidth ||
      !arraysEqual(lines, this.previousLines)
    ) {
      // Clear and redraw (naive; real impl does line-level diffing)
      this.terminal.write("\x1b[H"); // move cursor home
      for (const line of lines) {
        this.terminal.write(line + "\x1b[K\n"); // write + clear EOL
      }
      // Clear remaining old lines
      const extra = this.previousLines.length - lines.length;
      for (let i = 0; i < extra; i++) {
        this.terminal.write("\x1b[K\n");
      }

      this.previousLines = lines;
      this.previousWidth = width;
    }
  }

  private parseKey(data: Buffer): KeyData {
    // Extremely simplified key parser
    const s = data.toString();
    if (s === "\x03") return { key: "c", ctrl: true };
    if (s === "\r") return { key: "enter" };
    if (s === "\t") return { key: "tab" };
    if (s === "\x1b[A") return { key: "up" };
    if (s === "\x1b[B") return { key: "down" };
    return { key: s };
  }
}

// ------------------------------------------------------------
// Utility
// ------------------------------------------------------------

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
