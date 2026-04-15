import type { AgentSession } from "../../core/agent-session.js";

// ------------------------------------------------------------
// PrintMode — one-shot: prompt → stream to stdout → exit
// ------------------------------------------------------------

export class PrintMode {
  constructor(
    private session: AgentSession,
    private input: string,
  ) {}

  async run(): Promise<void> {
    // Stream output directly to stdout
    this.session.addEventListener((event) => {
      if (event.kind === "state-changed" && event.payload) {
        const delta = event.payload as { type?: string; delta?: string };
        if (delta.type === "text-delta" && delta.delta) {
          process.stdout.write(delta.delta);
        }
      }
    });

    await this.session.prompt(this.input);
    process.stdout.write("\n");
  }
}
