import type { Component } from "../tui.js";

export class Image implements Component {
  constructor(
    private src: string,
    private alt: string = "",
  ) {}

  render(_width: number): string[] {
    // Stub: real impl would use sixel / kitty graphics protocol
    return [`[img: ${this.alt || this.src}]`];
  }
}
