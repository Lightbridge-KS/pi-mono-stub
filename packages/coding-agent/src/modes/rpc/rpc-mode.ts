import type { AgentSession } from "../../core/agent-session.js";

// ------------------------------------------------------------
// RpcMode — JSON-RPC server for IDE integrations
// ------------------------------------------------------------

export class RpcMode {
  constructor(private session: AgentSession) {}

  async run(): Promise<void> {
    // Stub: real impl starts a JSON-RPC server on stdin/stdout or a socket
    console.log("[rpc] Listening for JSON-RPC requests...");
    console.log(`[rpc] Session has ${this.session.getTools().length} tools`);

    // Would handle methods like:
    //   { method: "prompt",  params: { text: "..." } }
    //   { method: "abort",   params: {} }
    //   { method: "state",   params: {} }
  }
}
