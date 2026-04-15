import type { Component, Focusable } from "../tui.js";
import type { KeyData } from "../keybindings.js";
import type { SelectList } from "./select-list.js";

// ------------------------------------------------------------
// Editor state types
// ------------------------------------------------------------

export interface EditorState {
  lines: string[];
  cursorRow: number;
  cursorCol: number;
}

export type UndoStack = EditorState[];

/** Ring buffer of killed (cut) text for yank/paste */
export class KillRing {
  private ring: string[] = [];

  push(text: string): void {
    this.ring.push(text);
  }

  yank(): string | undefined {
    return this.ring.at(-1);
  }
}

// ------------------------------------------------------------
// Editor — multi-line text editor with focus support
// ------------------------------------------------------------

export class Editor implements Component, Focusable {
  private state: EditorState;
  private undoStack: UndoStack = [];
  private killRing = new KillRing();
  private autocomplete?: SelectList;
  private hasFocus = false;

  constructor(private onSubmit: (text: string) => void) {
    this.state = { lines: [""], cursorRow: 0, cursorCol: 0 };
  }

  // --- Focusable ---

  onFocus(): void {
    this.hasFocus = true;
  }

  onBlur(): void {
    this.hasFocus = false;
  }

  // --- Component ---

  render(width: number): string[] {
    const out = this.state.lines.map((line, i) => {
      const prefix = i === this.state.cursorRow ? "> " : "  ";
      return (prefix + line).slice(0, width);
    });

    // Overlay autocomplete if active
    if (this.autocomplete) {
      out.push(...this.autocomplete.render(width));
    }
    return out;
  }

  handleInput(key: KeyData): boolean {
    // Delegate to autocomplete first if active
    if (this.autocomplete?.handleInput(key)) return true;

    if (key.ctrl && key.key === "z") {
      this.undo();
      return true;
    }
    if (key.key === "enter" && !key.shift) {
      this.onSubmit(this.state.lines.join("\n"));
      return true;
    }
    // Stub: handle normal character insertion, cursor movement, etc.
    return false;
  }

  // --- Private helpers ---

  private undo(): void {
    const prev = this.undoStack.pop();
    if (prev) this.state = prev;
  }
}
