import { every, type Job } from "../fivem/scheduler";
import { createLogger } from "../shared";
import { zoneBounds, zoneContains, type ZoneShape } from "../shared/zone";
import { cache } from "./cache";

/**
 * The zone checker: inside / outside checks at each zone's own interval, never per frame. Built for any count
 * (measured with 1,000,000 zones): zones sit in a grid of 64 m cells and a check looks only at the player's cell and
 * the zones the player is in. ai-lib runs one for every resource's zones (`zones.ts`); a resource runs its own only
 * while ai-lib does not.
 */

const log = createLogger(GetCurrentResourceName());

export interface ZoneOptions {
  shape: ZoneShape;
  /** How often to check, in ms (default 500, at least 50). A shop needs ~500, a fast trigger ~100; per-frame work belongs elsewhere. */
  interval?: number;
  onEnter?: () => void;
  onExit?: () => void;
}

const CELL = 64;
/** A zone wider than this many cells is kept in one list checked every time instead of in the grid. */
const MAX_CELLS = 64;
const cellKey = (cx: number, cy: number): number =>
  ((cx + 32768) << 16) | (cy + 32768);

class Zone {
  inside = false;
  nextCheck = 0;
  readonly interval: number;
  /** Grid cells the zone is filed under; empty when it is in the large list. */
  readonly cells: number[] = [];

  constructor(
    readonly options: ZoneOptions,
    inside: boolean,
  ) {
    this.interval = Math.max(50, options.interval ?? 500);
    this.inside = inside;
  }
}

/**
 * A set of zones. One scheduler job serves them all at the shortest interval any zone asks for; each zone is checked
 * only when its own interval has passed. With no zones the job stops.
 */
export class ZoneEngine {
  private readonly zones = new Map<string, Zone>();
  private readonly grid = new Map<number, Set<Zone>>();
  private readonly large = new Set<Zone>();
  private readonly insideNow = new Set<Zone>();
  /** How many zones use each interval, so the shortest one is found without walking every zone. */
  private readonly intervals = new Map<number, number>();
  private job: Job | null = null;
  private period = 0;

  /**
   * Adds (or replaces) a zone. A replaced zone the player was in fires its onExit first. `inside` seeds the state of a
   * zone handed over from another checker, so leaving it is noticed and staying in it fires nothing.
   */
  add(id: string, options: ZoneOptions, inside = false): void {
    this.remove(id);
    const zone = new Zone(options, inside);
    this.zones.set(id, zone);
    if (inside) this.insideNow.add(zone);
    const [minX, minY, maxX, maxY] = zoneBounds(options.shape);
    const x0 = Math.floor(minX / CELL);
    const y0 = Math.floor(minY / CELL);
    const x1 = Math.floor(maxX / CELL);
    const y1 = Math.floor(maxY / CELL);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_CELLS) this.large.add(zone);
    else {
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const key = cellKey(cx, cy);
          let cell = this.grid.get(key);
          if (!cell) this.grid.set(key, (cell = new Set()));
          cell.add(zone);
          zone.cells.push(key);
        }
      }
    }
    this.intervals.set(
      zone.interval,
      (this.intervals.get(zone.interval) ?? 0) + 1,
    );
    this.schedule();
  }

  /** Removes a zone; it fires onExit when the player was in it, unless `quiet` (a hand-over). */
  remove(id: string, quiet = false): void {
    const zone = this.zones.get(id);
    if (!zone) return;
    this.zones.delete(id);
    this.large.delete(zone);
    for (const key of zone.cells) {
      const cell = this.grid.get(key);
      cell?.delete(zone);
      if (cell?.size === 0) this.grid.delete(key);
    }
    const left = (this.intervals.get(zone.interval) ?? 1) - 1;
    if (left > 0) this.intervals.set(zone.interval, left);
    else this.intervals.delete(zone.interval);
    if (this.insideNow.delete(zone) && !quiet) this.fire(zone, false);
    this.schedule();
  }

  /** Removes every zone (exits fire for the ones the player is in). */
  clear(): void {
    const inside = [...this.insideNow];
    this.zones.clear();
    this.grid.clear();
    this.large.clear();
    this.insideNow.clear();
    this.intervals.clear();
    for (const zone of inside) this.fire(zone, false);
    this.schedule();
  }

  isInside(id: string): boolean {
    return this.zones.get(id)?.inside ?? false;
  }

  get size(): number {
    return this.zones.size;
  }

  private schedule(): void {
    let period = 0;
    for (const interval of this.intervals.keys())
      period = period === 0 ? interval : Math.min(period, interval);
    if (period === this.period) return;
    this.job?.stop();
    this.job = period
      ? every(period, () => this.check(), { name: "zones" })
      : null;
    this.period = period;
  }

  private check(): void {
    const now = GetGameTimer();
    const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
    // The zones the player is in go first, so leaving one is noticed wherever the player went.
    for (const zone of this.insideNow) this.test(zone, now, x, y, z);
    for (const zone of this.large) this.test(zone, now, x, y, z);
    const cell = this.grid.get(
      cellKey(Math.floor(x / CELL), Math.floor(y / CELL)),
    );
    if (cell) for (const zone of cell) this.test(zone, now, x, y, z);
  }

  private test(zone: Zone, now: number, x: number, y: number, z: number): void {
    if (now < zone.nextCheck) return;
    zone.nextCheck = now + zone.interval;
    const inside = zoneContains(zone.options.shape, x, y, z);
    if (inside === zone.inside) return;
    if (inside) this.insideNow.add(zone);
    else this.insideNow.delete(zone);
    this.fire(zone, inside);
  }

  private fire(zone: Zone, inside: boolean): void {
    zone.inside = inside;
    // A failing enter / exit handler must not stop the other zones.
    try {
      if (inside) zone.options.onEnter?.();
      else zone.options.onExit?.();
    } catch (error) {
      log.error("zone handler failed", error);
    }
  }
}
