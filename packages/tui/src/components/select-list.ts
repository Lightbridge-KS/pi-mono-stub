import type { Component } from "../tui.js";
import type { KeyData } from "../keybindings.js";

export interface SelectItem {
  label: string;
  value: string;
}

export interface SelectListTheme {
  selectedPrefix: string;
  unselectedPrefix: string;
}

export class SelectList implements Component {
  private selectedIndex = 0;

  constructor(
    public items: SelectItem[] = [],
    public theme: SelectListTheme = {
      selectedPrefix: "❯ ",
      unselectedPrefix: "  ",
    },
  ) {}

  render(width: number): string[] {
    return this.items.map((item, i) => {
      const prefix =
        i === this.selectedIndex
          ? this.theme.selectedPrefix
          : this.theme.unselectedPrefix;
      return (prefix + item.label).slice(0, width);
    });
  }

  handleInput(key: KeyData): boolean {
    if (key.key === "up" && this.selectedIndex > 0) {
      this.selectedIndex--;
      return true;
    }
    if (key.key === "down" && this.selectedIndex < this.items.length - 1) {
      this.selectedIndex++;
      return true;
    }
    return false;
  }
}
