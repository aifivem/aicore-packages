import { createLogger, type Logger } from "../shared";

/**
 * One scheduler per resource: every periodic job (per-frame work and fixed-interval checks) runs from a single
 * `setTick`, which exists only while a job is active (every tick handler or timer costs the resource time each frame).
 * Jobs with the same interval share a queue ordered by due time, so a frame with nothing due costs one timer read and
 * one comparison, and a due frame touches only the jobs that are due.
 */

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

/** The jobs of one interval: a ring buffer ordered by due time (a job that ran goes to the back, one interval later). */
class Group {
  private jobs: (ScheduledJob | undefined)[] = new Array<undefined>(8);
  private gens: number[] = new Array<number>(8).fill(0);
  private dues: number[] = new Array<number>(8).fill(0);
  private head = 0;
  private mask = 7;
  count = 0;

  constructor(readonly interval: number) {}

  /** Due time of the first entry (only valid while `count > 0`). */
  get front(): number {
    return this.dues[this.head] ?? 0;
  }

  /** Queue size that triggers dropping stale entries (doubles with the live entries kept). */
  private compactAt = 64;

  push(job: ScheduledJob, due: number): void {
    if (this.count >= this.compactAt) this.compact();
    if (this.count > this.mask) this.grow();
    const i = (this.head + this.count) & this.mask;
    this.jobs[i] = job;
    this.gens[i] = job.gen;
    this.dues[i] = due;
    this.count++;
  }

  /** Runs the due entries once each; entries added meanwhile wait for the next frame. */
  run(now: number): void {
    for (let left = this.count; left > 0 && this.count > 0; left--) {
      const i = this.head;
      const due = this.dues[i] ?? 0;
      if (due > now) return;
      const job = this.jobs[i];
      const gen = this.gens[i];
      this.jobs[i] = undefined;
      this.head = (i + 1) & this.mask;
      this.count--;
      if (!job || job.gen !== gen) continue;
      let next = due + this.interval;
      if (next <= now) next = now + this.interval;
      // Queued before the call, so the job may switch itself off (that entry then goes stale).
      this.push(job, next);
      job.call();
    }
  }

  /**
   * Drops entries of jobs switched off (or on again) since they were queued: a job toggled faster than its interval
   * leaves one per toggle. Order and due times of the live entries stay.
   */
  private compact(): void {
    let kept = 0;
    for (let n = 0; n < this.count; n++) {
      const i = (this.head + n) & this.mask;
      const job = this.jobs[i];
      if (!job || job.gen !== this.gens[i]) continue;
      const k = (this.head + kept) & this.mask;
      this.jobs[k] = job;
      this.gens[k] = this.gens[i] ?? 0;
      this.dues[k] = this.dues[i] ?? 0;
      kept++;
    }
    for (let n = kept; n < this.count; n++)
      this.jobs[(this.head + n) & this.mask] = undefined;
    this.count = kept;
    this.compactAt = Math.max(64, kept * 2);
  }

  private grow(): void {
    const size = (this.mask + 1) * 2;
    const jobs = new Array<ScheduledJob | undefined>(size);
    const gens = new Array<number>(size).fill(0);
    const dues = new Array<number>(size).fill(0);
    for (let n = 0; n < this.count; n++) {
      const i = (this.head + n) & this.mask;
      jobs[n] = this.jobs[i];
      gens[n] = this.gens[i] ?? 0;
      dues[n] = this.dues[i] ?? 0;
    }
    this.jobs = jobs;
    this.gens = gens;
    this.dues = dues;
    this.head = 0;
    this.mask = size - 1;
  }
}

class Scheduler {
  private readonly groups: Group[] = [];
  private readonly byInterval = new Map<number, Group>();
  private tick: number | null = null;
  private active = 0;
  private nextDue = Infinity;
  private running = false;

  activate(job: ScheduledJob): void {
    job.gen++;
    this.active++;
    const due = GetGameTimer() + job.interval;
    let group = this.byInterval.get(job.interval);
    if (!group) {
      group = new Group(job.interval);
      this.byInterval.set(job.interval, group);
      this.groups.push(group);
    }
    group.push(job, due);
    if (due < this.nextDue) this.nextDue = due;
    this.tick ??= setTick(this.onTick);
  }

  deactivate(job: ScheduledJob): void {
    job.gen++;
    this.active--;
    if (this.active === 0 && !this.running) this.halt();
  }

  /** No active job: the tick goes away and the queues are emptied of their stale entries. */
  private halt(): void {
    if (this.tick !== null) clearTick(this.tick);
    this.tick = null;
    this.groups.length = 0;
    this.byInterval.clear();
    this.nextDue = Infinity;
  }

  private readonly onTick = (): void => {
    const now = GetGameTimer();
    if (now < this.nextDue) return;
    const groups = this.groups;
    this.running = true;
    // A group created by a job during this pass is visited too (its entries are due one interval later).
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group && group.count > 0 && group.front <= now) group.run(now);
    }
    this.running = false;
    if (this.active === 0) return this.halt();
    let soonest = Infinity;
    let kept = 0;
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (!group) continue;
      if (group.count === 0) {
        this.byInterval.delete(group.interval);
        continue;
      }
      groups[kept++] = group;
      if (group.front < soonest) soonest = group.front;
    }
    groups.length = kept;
    this.nextDue = soonest;
  };
}

const scheduler = new Scheduler();

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
