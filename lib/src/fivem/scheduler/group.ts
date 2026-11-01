/** What a queue needs of a job: its switch number, its interval and the call. */
export interface QueuedJob {
  /** Bumped on every switch; a queue entry with an older number is dropped when it comes up. */
  gen: number;
  readonly interval: number;
  call(): void;
}

/** The jobs of one interval: a ring buffer ordered by due time (a job that ran goes to the back, one interval later). */
export class Group {
  private jobs: (QueuedJob | undefined)[] = new Array<undefined>(8);
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

  push(job: QueuedJob, due: number): void {
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
    const jobs = new Array<QueuedJob | undefined>(size);
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
