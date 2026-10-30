import { createLogger } from "../shared";
import { cache } from "./cache";

/**
 * Zones on this client: inside / outside checks at each zone's own interval, never per frame. Built for any count
 * (measured with 1,000,000 zones): zones sit in a grid of 64 m cells and a check looks only at the player's cell and
 * the zones the player is in.
 */

const log = createLogger(GetCurrentResourceName());

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type ZoneShape =
  /** A ball around a point. */
  | { type: "sphere"; center: Vec3; radius: number }
  /** A circle on the ground plane, `height` metres up and down from the centre. */
  | { type: "cylinder"; center: Vec3; radius: number; height: number }
  /** A ground polygon (x, y points in order) between two heights. */
  | {
      type: "poly";
      points: Array<{ x: number; y: number }>;
      minZ: number;
      maxZ: number;
    };

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

function contains(shape: ZoneShape, x: number, y: number, z: number): boolean {
  switch (shape.type) {
    case "sphere": {
      const dx = x - shape.center.x;
      const dy = y - shape.center.y;
      const dz = z - shape.center.z;
      return dx * dx + dy * dy + dz * dz <= shape.radius * shape.radius;
    }
    case "cylinder": {
      const dx = x - shape.center.x;
      const dy = y - shape.center.y;
      return (
        dx * dx + dy * dy <= shape.radius * shape.radius &&
        Math.abs(z - shape.center.z) <= shape.height
      );
    }
    case "poly": {
      if (z < shape.minZ || z > shape.maxZ) return false;
      // Ray casting: count the edges a ray to +x crosses.
      let inside = false;
      const p = shape.points;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const a = p[i]!;
        const b = p[j]!;
        if (
          a.y > y !== b.y > y &&
          x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
        )
          inside = !inside;
      }
      return inside;
    }
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

/** Ground bounding box of a shape: [minX, minY, maxX, maxY]. */
function bounds(shape: ZoneShape): [number, number, number, number] {
  if (shape.type !== "poly")
    return [
      shape.center.x - shape.radius,
      shape.center.y - shape.radius,
      shape.center.x + shape.radius,
      shape.center.y + shape.radius,
    ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of shape.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return [minX, minY, maxX, maxY];
}

class Zone {
  inside = false;
  nextCheck = 0;
  readonly interval: number;
  /** Grid cells the zone is filed under; empty when it is in the large list. */
  readonly cells: number[] = [];

  constructor(readonly options: ZoneOptions) {
    this.interval = Math.max(50, options.interval ?? 500);
  }
}

/**
 * The zones of one resource. One timer serves them all at the shortest interval any zone asks for; each zone is
 * checked only when its own interval has passed. With no zones the timer stops (an active JS timer costs every frame).
 */
export class Zones {
  private readonly zones = new Map<string, Zone>();
  private readonly grid = new Map<number, Set<Zone>>();
  private readonly large = new Set<Zone>();
  private readonly insideNow = new Set<Zone>();
  /** How many zones use each interval, so the shortest one is found without walking every zone. */
  private readonly intervals = new Map<number, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private period = 0;

  /** Adds (or replaces) a zone. A replaced zone the player was in fires its onExit first. */
  add(id: string, options: ZoneOptions): void {
    this.remove(id);
    const zone = new Zone(options);
    this.zones.set(id, zone);
    const [minX, minY, maxX, maxY] = bounds(options.shape);
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

  remove(id: string): void {
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
    if (this.insideNow.delete(zone)) this.fire(zone, false);
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
    if (this.timer) clearInterval(this.timer);
    this.timer = period ? setInterval(() => this.check(), period) : null;
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
    const inside = contains(zone.options.shape, x, y, z);
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
