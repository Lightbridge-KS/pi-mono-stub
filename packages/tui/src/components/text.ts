import type { Component } from "../tui.js";

export class Text implements Component {
  constructor(private content: string) {}

  render(width: number): string[] {
    // Stub: word-wrap content to `width`
    return [this.content.slice(0, width)];
  }
}
