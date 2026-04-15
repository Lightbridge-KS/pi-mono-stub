import type { AssistantMessage, AssistantMessageEvent } from "../types.js";

// ------------------------------------------------------------
// EventStream<T, R> — Generic async-iterable stream
// ------------------------------------------------------------
//
//  Producers call:   push(event)  → enqueue an event
//                    end(result?) → signal completion
//
//  Consumers use:    for await (const event of stream) { ... }
//                    const final = await stream.result();
//

export class EventStream<T, R> {
  // --- private state ---
  private queue: T[] = [];
  private done: boolean = false;
  private finalResultPromise: Promise<R>;

  private resolveResult!: (value: R) => void;
  private waiting: ((value: IteratorResult<T>) => void) | null = null;

  constructor() {
    this.finalResultPromise = new Promise<R>((resolve) => {
      this.resolveResult = resolve;
    });
  }

  // --- public API ---

  /** Enqueue an event for consumers */
  push(event: T): void {
    if (this.done) return;

    // If a consumer is already waiting, deliver immediately
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = null;
      resolve({ value: event, done: false });
    } else {
      this.queue.push(event);
    }
  }

  /** Signal that the stream is complete */
  end(result?: R): void {
    this.done = true;

    // Resolve the final-result promise
    this.resolveResult(result as R);

    // If a consumer is waiting, tell it we're done
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = null;
      resolve({ value: undefined as unknown as T, done: true });
    }
  }

  /** Await the final aggregated result after the stream ends */
  result(): Promise<R> {
    return this.finalResultPromise;
  }

  /** Makes the stream usable with `for await...of` */
  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        // Drain buffered events first
        const buffered = this.queue.shift();
        if (buffered !== undefined) {
          return Promise.resolve({ value: buffered, done: false });
        }
        // Stream already finished
        if (this.done) {
          return Promise.resolve({
            value: undefined as unknown as T,
            done: true,
          });
        }
        // Park until push() or end() is called
        return new Promise((resolve) => {
          this.waiting = resolve;
        });
      },
    };
  }
}

// ------------------------------------------------------------
// AssistantMessageEventStream
//   — Concrete stream: pushes events, resolves a full message
// ------------------------------------------------------------

export class AssistantMessageEventStream extends EventStream<
  AssistantMessageEvent, // T — events pushed during streaming
  AssistantMessage       // R — final aggregated result
> {}
