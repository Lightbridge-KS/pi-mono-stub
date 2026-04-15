import { Agent } from "@pi-mono-stub/agent-core";
import { anthropicProvider, claude } from "@pi-mono-stub/ai";
import {
  AppStorage,
  ChatPanel,
  IndexedDBStorageBackend,
} from "@pi-mono-stub/webui";

// ------------------------------------------------------------
// Bootstrap — the "web app entry point" (runnable in Node for
// demonstration, since our Lit stubs are DOM-free).
// ------------------------------------------------------------

async function bootstrapApp(): Promise<void> {
  // 1. Set up storage
  const backend = new IndexedDBStorageBackend("pi-web-ui");
  const storage = new AppStorage(backend);

  // 2. Load saved settings (IndexedDB stub returns undefined → "dark")
  const theme = await storage.settings.getTheme();
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }

  // 3. Create a real Agent backed by pi-ai's Anthropic stub provider
  const agent = new Agent({
    model: claude,
    systemPrompt: "You are a helpful assistant.",
    streamFn: anthropicProvider.stream.bind(anthropicProvider),
  });

  // 4. Mount the chat panel and wire the agent
  const chatPanel = new ChatPanel();
  await chatPanel.setAgent(agent);

  console.log("[app] pi-web-ui bootstrapped with theme:", theme);

  // 5. Drive a prompt to prove the event pipeline is alive.
  //    ChatPanel.setAgent subscribes to agent events; after prompt()
  //    completes, agent.state() has the full message history.
  await agent.prompt("Say hello!");

  const state = agent.state();
  console.log(`[app] messages: ${state.messages.length}`);
  console.log(`[app] last:`, state.messages.at(-1));

  // In a real web app this is where we'd:
  //   document.body.appendChild(chatPanel as unknown as Node);
}

bootstrapApp().catch(console.error);
