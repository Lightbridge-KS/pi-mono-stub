import { Agent } from "@pi-mono-stub/agent-core";
import { anthropicProvider, claude } from "@pi-mono-stub/ai";
import { ProcessTerminal, TUI } from "@pi-mono-stub/tui";
import {
  AgentSession,
  ExtensionRunner,
  InteractiveMode,
  ModelRegistry,
  PrintMode,
  RpcMode,
  SessionManager,
  SettingsManager,
  bashToolDef,
  readFileToolDef,
  writeFileToolDef,
  type AuthStorage,
} from "../src/index.js";

// ------------------------------------------------------------
// CLI entry point — `pi` binary
// ------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // --- Parse CLI flags ---
  const modeFlag = args.includes("--print")
    ? "print"
    : args.includes("--rpc")
      ? "rpc"
      : "interactive";

  const inputText = args.filter((a) => !a.startsWith("--")).join(" ");

  // --- Bootstrap subsystems ---
  const auth: AuthStorage = {
    getKey: (p) => process.env[`${p.toUpperCase()}_API_KEY`],
    setKey: () => {},
  };

  const settings = new SettingsManager();
  settings.set("theme", "dark");
  settings.set("model", claude.id);

  const models = new ModelRegistry(auth);
  models.registerProvider("anthropic", {
    baseUrl: "https://api.anthropic.com",
    models: ["claude-sonnet-4-20250514", "claude-opus-4-20250514"],
    authType: "api-key",
  });

  const home = process.env.HOME ?? "/tmp";
  const sessionManager = new SessionManager(
    `${home}/.pi/sessions/${Date.now()}`,
  );

  const extensions = new ExtensionRunner();

  // --- Create a real Agent backed by pi-ai's Anthropic stub provider ---
  const agent = new Agent({
    model: claude,
    systemPrompt: "You are a helpful coding assistant.",
    streamFn: anthropicProvider.stream.bind(anthropicProvider),
  });

  // --- Assemble the session ---
  const session = new AgentSession({
    agent,
    sessionManager,
    settings,
    models,
    extensions,
    tools: [bashToolDef, readFileToolDef, writeFileToolDef],
  });

  // --- Run the selected mode ---
  switch (modeFlag) {
    case "print":
      await new PrintMode(session, inputText || "Hello!").run();
      break;

    case "rpc":
      await new RpcMode(session).run();
      break;

    case "interactive":
    default: {
      const tui = new TUI(new ProcessTerminal());
      await new InteractiveMode(tui, session).run();
      break;
    }
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
