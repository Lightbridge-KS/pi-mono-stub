import type { Component } from "../tui.js";

export interface MarkdownTheme {
  headingStyle: "bold" | "underline";
  codeBlockBg?: string;
}

export class Markdown implements Component {
  constructor(
    private source: string,
    public theme: MarkdownTheme = { headingStyle: "bold" },
  ) {}

  render(width: number): string[] {
    // Stub: parse markdown → styled terminal lines
    return this.source.split("\n").map((line) => line.slice(0, width));
  }
}
