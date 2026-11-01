import { every } from "../../fivem/scheduler/every";
import { cellKey, createLogger } from "../../shared";
import { cache } from "../cache";
import type { ModelScanDef } from "./def";
import { CELL, MOVE_MARGIN, ObjectIndex } from "./objectIndex";
import { closestObject, nearestOf, Scan, type Near } from "./scan";

/**
 * The model point scan: for each point, the nearest world object (or vehicle) of its models within its radius, two
 * times a second, told only when it changes. ai-lib runs one for every resource's prompt-mode model points
 * (`modelHost.ts`); a resource runs its own only while ai-lib does not.
 */

const log = createLogger(GetCurrentResourceName());

const SCAN_MS = 500;
/** While the player stands still (and stays in or out of a vehicle) a scan is skipped, but not more than this many in a row. */
const IDLE_SCANS = 6;

/**
 * A set of model points scanned by one scheduler job (500 ms, only while it holds points). Scans are skipped while
 * the player stands still, refreshed every 3 s; the vehicle pool is walked once per scan for every vehicle point and
 * the object index once for every many-model point.
 */
export class ModelScanner {
  private readonly scans = new Map<string, Scan>();
  private readonly index = new ObjectIndex();
  /** Models of every many-model point, rebuilt when the points change. */
  private wanted: Set<number> | null = null;
  private readonly last = {
    x: 0,
    y: 0,
    z: 0,
    inVehicle: false,
    idle: IDLE_SCANS,
  };
  private readonly job = every(SCAN_MS, () => this.scan(), {
    active: false,
    name: "modelPoints",
  });

  /** Adds (or replaces) a point; `entity` seeds the nearest one already known (a hand-over), so only a change is told. */
  add(
    key: string,
    def: ModelScanDef,
    onNearest: (entity: number) => void,
    entity = 0,
  ): void {
    this.scans.set(key, new Scan(def, onNearest, entity));
    this.wanted = null;
    // The next scan runs even if the player stands still.
    this.last.idle = IDLE_SCANS;
    this.job.set(true);
  }

  remove(key: string): void {
    if (!this.scans.delete(key)) return;
    this.wanted = null;
    this.job.set(this.scans.size > 0);
  }

  get size(): number {
    return this.scans.size;
  }

  private scan(): void {
    const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
    const inVehicle = cache.vehicle !== false;
    const last = this.last;
    const still =
      inVehicle === last.inVehicle &&
      Math.hypot(x - last.x, y - last.y, z - last.z) < 1;
    if (still && ++last.idle < IDLE_SCANS) return;
    Object.assign(last, { x, y, z, inVehicle, idle: 0 });

    let vehicleRadius = 0;
    let indexRadius = 0;
    for (const scan of this.scans.values()) {
      if (scan.skipped(inVehicle)) continue;
      if (scan.def.vehicles)
        vehicleRadius = Math.max(vehicleRadius, scan.def.radius);
      else if (scan.indexed)
        indexRadius = Math.max(indexRadius, scan.def.radius);
    }
    const vehicles = vehicleRadius
      ? this.nearVehicles(x, y, z, vehicleRadius)
      : [];
    const objects = indexRadius ? this.nearIndexed(x, y, z, indexRadius) : [];

    for (const scan of this.scans.values()) {
      const found = scan.skipped(inVehicle)
        ? 0
        : scan.def.vehicles
          ? nearestOf(vehicles, scan)
          : scan.indexed
            ? nearestOf(objects, scan)
            : closestObject(x, y, z, scan);
      if (found === scan.entity) continue;
      scan.entity = found;
      try {
        scan.onNearest(found);
      } catch (error) {
        log.error("model point handler failed", error);
      }
    }
  }

  /** Vehicles within `radius`: one pool walk for every vehicle point. */
  private nearVehicles(x: number, y: number, z: number, radius: number) {
    const near: Near[] = [];
    for (const entity of GetGamePool("CVehicle") as number[]) {
      const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(entity, false);
      const dist = Math.hypot(vx - x, vy - y, vz - z);
      if (dist < radius)
        near.push({ entity, model: GetEntityModel(entity), dist });
    }
    return near;
  }

  /** Indexed objects within `radius`: filtered by where they stood when found, then checked where they are now. */
  private nearIndexed(x: number, y: number, z: number, radius: number) {
    if (!this.wanted) {
      this.wanted = new Set();
      for (const scan of this.scans.values())
        if (scan.indexed)
          for (const hash of scan.def.models) this.wanted.add(hash);
    }
    this.index.advance(this.wanted);
    const near: Near[] = [];
    const reach = (radius + MOVE_MARGIN) ** 2;
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    for (let ox = -1; ox <= 1; ox++)
      for (let oy = -1; oy <= 1; oy++) {
        const list = this.index.cells.get(cellKey(cx + ox, cy + oy));
        if (list) this.nearIn(list, x, y, z, radius, reach, near);
      }
    return near;
  }

  /** The objects of one index cell within `radius` (filtered by `reach` on their found place first). */
  private nearIn(
    list: number[],
    x: number,
    y: number,
    z: number,
    radius: number,
    reach: number,
    near: Near[],
  ): void {
    for (let i = 0; i < list.length; i += 4) {
      const dx = (list[i + 1] ?? 0) - x;
      const dy = (list[i + 2] ?? 0) - y;
      const dz = (list[i + 3] ?? 0) - z;
      if (dx * dx + dy * dy + dz * dz > reach) continue;
      const entity = list[i] ?? 0;
      if (!DoesEntityExist(entity)) continue;
      const [ox = 0, oy = 0, oz = 0] = GetEntityCoords(entity, false);
      const dist = Math.hypot(ox - x, oy - y, oz - z);
      if (dist < radius)
        near.push({ entity, model: GetEntityModel(entity), dist });
    }
  }
}
