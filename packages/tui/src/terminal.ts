// ------------------------------------------------------------
// Terminal (Interface) + ProcessTerminal
// ------------------------------------------------------------

export interface Terminal {
  columns: number;
  rows: number;
  start(): void;
  write(s: string): void;
  stop(): void;
}

export class ProcessTerminal implements Terminal {
  get columns(): number {
    return process.stdout.columns ?? 80;
  }
  get rows(): number {
    return process.stdout.rows ?? 24;
  }

  start(): void {
    // Enter raw mode for key-by-key input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    // Hide cursor, enter alternate screen
    process.stdout.write("\x1b[?1049h"); // alt screen
    process.stdout.write("\x1b[?25l");   // hide cursor
  }

  write(s: string): void {
    process.stdout.write(s);
  }

  stop(): void {
    process.stdout.write("\x1b[?25h");   // show cursor
    process.stdout.write("\x1b[?1049l"); // exit alt screen
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  }
}
