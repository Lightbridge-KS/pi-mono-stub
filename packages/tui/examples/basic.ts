import {
  Box,
  Editor,
  Markdown,
  ProcessTerminal,
  SelectList,
  TUI,
} from "@pi-mono-stub/tui";

function main(): void {
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

  // Instead of the interactive render loop (tui.start()) — which enters
  // raw mode and the alt screen — render once to stdout so this demo is
  // safe to run and visually demonstrates the Composite pattern.
  const width = 60;
  for (const line of tui.render(width)) {
    console.log(line);
  }

  // To try the interactive version, uncomment the next line and run
  // `pnpm --filter @pi-mono-stub/tui example` in a real TTY. Ctrl-C quits.
  // tui.start();
}

main();
