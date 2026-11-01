import { Group, type QueuedJob } from "./group";

/**
 * One scheduler per resource: every periodic job (per-frame work and fixed-interval checks) runs from a single
 * `setTick`, which exists only while a job is active (every tick handler or timer costs the resource time each frame).
 * Jobs with the same interval share a queue ordered by due time, so a frame with nothing due costs one timer read and
 * one comparison, and a due frame touches only the jobs that are due.
 */

class Scheduler {
  private readonly groups: Group[] = [];
  private readonly byInterval = new Map<number, Group>();
  private tick: number | null = null;
  private active = 0;
  private nextDue = Infinity;
  private running = false;

  activate(job: QueuedJob): void {
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

  deactivate(job: QueuedJob): void {
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

export const scheduler = new Scheduler();
