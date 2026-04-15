import type { TUI } from "@pi-mono-stub/tui";
import type { AgentSession } from "../../core/agent-session.js";

// ------------------------------------------------------------
// InteractiveMode — full TUI with editor and streaming output
// ------------------------------------------------------------

export class InteractiveMode {
  constructor(
    private tui: TUI,
    private session: AgentSession,
  ) {}

  async run(): Promise<void> {
    // Wire session events → TUI re-renders
    this.session.addEventListener(() => {
      this.tui.render();
    });

    // Start the TUI event loop
    this.tui.start();

    // Stub: the TUI's Editor.onSubmit would call:
    //   this.session.prompt(userInput)
    // which drives the agent loop and streams back via events
    console.log("[interactive] TUI started. Waiting for input...");
  }
}
