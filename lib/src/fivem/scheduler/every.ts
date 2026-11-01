import { createLogger, type Logger } from "../../shared";
import { scheduler } from "./scheduler";

export interface EveryOptions {
  /** Start at once (default true); `false` creates the job switched off. */
  active?: boolean;
  /** Name in the error log (default the function's name). */
  name?: string;
}

/** A periodic job registered with `every`. */
export interface Job {
  /** True while the job is switched on. */
  readonly running: boolean;
  /** Switches the job on (first run one interval later; next frame for 0) or off. */
  set(active: boolean): void;
  /** Switches the job off for good (`set(true)` does nothing afterwards). */
  stop(): void;
}

/** A failing job is logged at most once per this many ms (the errors in between are counted into the next line). */
const ERROR_LOG_MS = 10_000;
let log: Logger | null = null;

class ScheduledJob implements Job {
  /** Bumped on every switch; a queue entry with an older number is dropped when it comes up. */
  gen = 0;
  private active = false;
  private stopped = false;
  private quietUntil = 0;
  private skipped = 0;

  constructor(
    readonly interval: number,
    private readonly fn: () => unknown,
    private readonly name: string,
  ) {}

  get running(): boolean {
    return this.active;
  }

  set(active: boolean): void {
    if (active === this.active || (active && this.stopped)) return;
    this.active = active;
    if (active) scheduler.activate(this);
    else scheduler.deactivate(this);
  }

  stop(): void {
    this.set(false);
    this.stopped = true;
  }

  call(): void {
    try {
      const result = this.fn();
      if (result instanceof Promise)
        result.catch((error: unknown) => this.fail(error));
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    const now = GetGameTimer();
    if (now < this.quietUntil) {
      this.skipped++;
      return;
    }
    this.quietUntil = now + ERROR_LOG_MS;
    const more = this.skipped ? ` (+${this.skipped} more)` : "";
    this.skipped = 0;
    log ??= createLogger(GetCurrentResourceName());
    log.error(
      `job "${this.name}" failed${more}`,
      error instanceof Error ? (error.stack ?? error.message) : error,
    );
  }
}


/**
 * Runs `fn` every `ms` milliseconds (0 = every frame) from the resource's one scheduler tick; replaces `setInterval`
 * and `setTick` for periodic work. A throwing (or rejecting) job is logged with its name and keeps running; the others
 * are not affected. Jobs due in the same frame run in the order they were switched on, grouped by interval.
 */
export function every(
  ms: number,
  fn: () => unknown,
  options: EveryOptions = {},
): Job {
  const interval = Math.max(0, Math.floor(ms));
  const job = new ScheduledJob(
    interval,
    fn,
    options.name ?? (fn.name || "anonymous"),
  );
  if (options.active !== false) job.set(true);
  return job;
}
