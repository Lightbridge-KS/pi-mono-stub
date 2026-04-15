import type { Agent, Unsubscribe } from "@pi-mono-stub/agent-core";
import { html, LitElement, type TemplateResult } from "../lit-stubs.js";

// ------------------------------------------------------------
// AgentInterface — manages agent subscription lifecycle
// ------------------------------------------------------------

export class AgentInterface extends LitElement {
  session?: Agent;
  private unsubscribe?: Unsubscribe;

  connectedCallback(): void {
    super.connectedCallback();
    this.setupSessionSubscription();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  render(): TemplateResult {
    return html`<slot></slot>`;
  }

  private setupSessionSubscription(): void {
    if (!this.session) return;
    this.unsubscribe = this.session.subscribe(() => {
      // Propagate agent events to child components via CustomEvent
      // dispatch or reactive property updates
      this.requestUpdate();
    });
  }
}
