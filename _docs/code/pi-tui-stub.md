# `pi-tui` Stub

```ts
// ============================================================
// pi-tui Architecture — Stub Implementation
// ============================================================

// ------------------------------------------------------------
// 1. Supporting Types
// ------------------------------------------------------------

interface KeyData {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

interface KeyBinding {
  action: string;
  key: KeyData;
  description?: string;
}

type Action = string;

interface OverlayHandle {
  id: string;
  component: Component;
  dismiss(): void;
}

// ------------------------------------------------------------
// 2. Component (Interface) — The core building block
// ------------------------------------------------------------
//
//  Every visual element implements this.
//  render() returns an array of strings (one per line).
//  handleInput() is optional — only interactive components
//  need it; returns true if the key was consumed.
//

interface Component {
  render(width: number): string[];
  handleInput?(key: KeyData): boolean;
}

// ------------------------------------------------------------
// 3. Focusable (Interface) — For components that receive focus
// ------------------------------------------------------------

interface Focusable {
  onFocus(): void;
  onBlur(): void;
}

/** Type guard: does this component also implement Focusable? */
function isFocusable(c: unknown): c is Focusable {
  return (
    typeof c === "object" &&
    c !== null &&
    "onFocus" in c &&
    "onBlur" in c
  );
}

// ------------------------------------------------------------
// 4. Leaf Components — Image, Text, Box
// ------------------------------------------------------------

class Image implements Component {
  constructor(
    private src: string,
    private alt: string = "",
  ) {}

  render(width: number): string[] {
    // Stub: real impl would use sixel / kitty graphics protocol
    return [`[img: ${this.alt || this.src}]`];
  }
}

class Text implements Component {
  constructor(private content: string) {}

  render(width: number): string[] {
    // Stub: word-wrap content to `width`
    return [this.content.slice(0, width)];
  }
}

class Box implements Component {
  constructor(
    private child: Component,
    private border: boolean = true,
  ) {}

  render(width: number): string[] {
    const inner = this.child.render(width - 4);
    if (!this.border) return inner;

    const top = "┌" + "─".repeat(width - 2) + "┐";
    const bot = "└" + "─".repeat(width - 2) + "┘";
    const lines = inner.map((l) => `│ ${l.padEnd(width - 4)} │`);
    return [top, ...lines, bot];
  }
}

// ------------------------------------------------------------
// 5. Markdown — Renders themed markdown to terminal lines
// ------------------------------------------------------------

interface MarkdownTheme {
  headingStyle: "bold" | "underline";
  codeBlockBg?: string;
}

class Markdown implements Component {
  constructor(
    private source: string,
    public theme: MarkdownTheme = { headingStyle: "bold" },
  ) {}

  render(width: number): string[] {
    // Stub: parse markdown → styled terminal lines
    return this.source.split("\n").map((line) => line.slice(0, width));
  }
}

// ------------------------------------------------------------
// 6. SelectList — A scrollable list of selectable items
// ------------------------------------------------------------

interface SelectItem {
  label: string;
  value: string;
}

interface SelectListTheme {
  selectedPrefix: string;
  unselectedPrefix: string;
}

class SelectList implements Component {
  private selectedIndex = 0;

  constructor(
    public items: SelectItem[] = [],
    public theme: SelectListTheme = {
      selectedPrefix: "❯ ",
      unselectedPrefix: "  ",
    },
  ) {}

  render(width: number): string[] {
    return this.items.map((item, i) => {
      const prefix =
        i === this.selectedIndex
          ? this.theme.selectedPrefix
          : this.theme.unselectedPrefix;
      return (prefix + item.label).slice(0, width);
    });
  }

  handleInput(key: KeyData): boolean {
    if (key.key === "up" && this.selectedIndex > 0) {
      this.selectedIndex--;
      return true;
    }
    if (key.key === "down" && this.selectedIndex < this.items.length - 1) {
      this.selectedIndex++;
      return true;
    }
    return false;
  }
}

// ------------------------------------------------------------
// 7. Editor — Multi-line text editor with focus support
// ------------------------------------------------------------

interface EditorState {
  lines: string[];
  cursorRow: number;
  cursorCol: number;
}

type UndoStack = EditorState[];

/** Ring buffer of killed (cut) text for yank/paste */
class KillRing {
  private ring: string[] = [];
  push(text: string): void {
    this.ring.push(text);
  }
  yank(): string | undefined {
    return this.ring.at(-1);
  }
}

class Editor implements Component, Focusable {
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

  private undo(): void {
    const prev = this.undoStack.pop();
    if (prev) this.state = prev;
  }
}

// ------------------------------------------------------------
// 8. Container — Composite component holding children
//    (Composite Pattern)
// ------------------------------------------------------------

class Container implements Component {
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
// 9. Terminal (Interface) + ProcessTerminal
// ------------------------------------------------------------

interface Terminal {
  columns: number;
  rows: number;
  start(): void;
  write(s: string): void;
  stop(): void;
}

class ProcessTerminal implements Terminal {
  get columns(): number {
    return process.stdout.columns ?? 80;
  }
  get rows(): number {
    return process.stdout.rows ?? 24;
  }

  start(): void {
    // Enter raw mode for key-by-key input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    // Hide cursor, enter alternate screen
    process.stdout.write("\x1b[?1049h"); // alt screen
    process.stdout.write("\x1b[?25l");   // hide cursor
  }

  write(s: string): void {
    process.stdout.write(s);
  }

  stop(): void {
    process.stdout.write("\x1b[?25h");   // show cursor
    process.stdout.write("\x1b[?1049l"); // exit alt screen
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  }
}

// ------------------------------------------------------------
// 10. KeybindingsManager — Maps key input → named actions
// ------------------------------------------------------------

class KeybindingsManager {
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

// ------------------------------------------------------------
// 11. TUI — The top-level orchestrator
// ------------------------------------------------------------
//
//  Owns the Terminal, manages focus, and drives the render loop.
//  Implements Component itself so it can be composed if needed.
//
//    TUI ◇──> Terminal       (composition — owns the terminal)
//    TUI ──> KeybindingsManager
//    TUI ──> Component       (implements)
//

class TUI implements Component {
  // --- private state ---
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

  // --- Component interface ---

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
    if (this.focused && "handleInput" in this.focused) {
      const consumed = (this.focused as Component).handleInput?.(key);
      if (consumed) return true;
    }

    // 3. Propagate to root container
    return this.root.handleInput(key) ?? false;
  }

  // --- Public API ---

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
      this.terminal.write("\x1b[H");  // move cursor home
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

// --- Utility ---

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ============================================================
// EXAMPLE USAGE
// ============================================================

function main() {
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  // Build the component tree
  const root = tui.getRoot();

  //  ┌─────────────────────────────────────────┐
  //  │  Markdown (welcome header)              │
  //  │  SelectList (model picker)              │
  //  │  Editor (user input)                    │
  //  └─────────────────────────────────────────┘

  const header = new Markdown("# pi-ai\nWelcome to the AI assistant.");
  const modelPicker = new SelectList([
    { label: "claude-sonnet-4-20250514", value: "sonnet" },
    { label: "claude-opus-4-20250514", value: "opus" },
    { label: "gpt-4o", value: "gpt4o" },
  ]);
  const editor = new Editor((text) => {
    console.log("Submitted:", text);
  });

  root.addChild(new Box(header));
  root.addChild(modelPicker);
  root.addChild(new Box(editor));

  // Focus the editor so it receives key input
  tui.setFocus(editor);

  // Start the render loop
  tui.start();
}

// Uncomment to run:
// main();
```