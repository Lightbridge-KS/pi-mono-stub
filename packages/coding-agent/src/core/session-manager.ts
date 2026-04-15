import { randomUUID } from "node:crypto";
import type { AgentMessage } from "@pi-mono-stub/agent-core";

// ------------------------------------------------------------
// SessionManager — persists conversation to disk
// ------------------------------------------------------------

export interface SessionEntry {
  id: string;
  timestamp: number;
  type: "message" | "tool-call" | "tool-result" | "meta";
  data: unknown;
}

export class SessionManager {
  private entries: SessionEntry[] = [];

  constructor(private dir: string) {}

  appendMessage(m: AgentMessage): void {
    this.entries.push({
      id: randomUUID(),
      timestamp: Date.now(),
      type: "message",
      data: m,
    });
  }

  appendEntry(e: SessionEntry): void {
    this.entries.push(e);
  }

  getEntries(): SessionEntry[] {
    return [...this.entries];
  }

  /** Branch creates a new SessionManager that shares history up to now */
  branch(): SessionManager {
    const branched = new SessionManager(
      this.dir + "/branch-" + Date.now(),
    );
    branched.entries = [...this.entries];
    return branched;
  }
}
