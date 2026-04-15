import type { Component } from "../tui.js";

export class Box implements Component {
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
