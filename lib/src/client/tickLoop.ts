import { every, type Job } from "../fivem/scheduler";

/** A per-frame job (`every(0, fn)` on the resource's scheduler) switched on only while needed. */
export class TickLoop {
  private readonly job: Job;

  constructor(onFrame: () => void, name?: string) {
    this.job = every(0, onFrame, { active: false, name });
  }

  get running(): boolean {
    return this.job.running;
  }

  set(active: boolean): void {
    this.job.set(active);
  }
}
