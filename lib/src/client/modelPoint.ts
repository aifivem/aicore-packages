import { every } from "../fivem/scheduler";
import { cache } from "./cache";
import {
  pointStyle,
  readAllowed,
  readLabel,
  runPress,
  target,
  type Style,
} from "./interact";
import { hidePrompt, showPrompt } from "./prompt";

export interface ModelPointOptions {
  /** World objects this point is on (ATMs, vending machines, dumpsters). */
  models: Array<string | number>;
  /** The models are vehicles (boats, trucks): the prompt scan looks at nearby vehicles instead of objects. */
  vehicles?: boolean;
  label: string | (() => string);
  icon?: string;
  /** How close to the object, in metres (default 1.5). */
  radius?: number;
  /** Object points are skipped while the player sits in a vehicle (no scan, no prompt) unless this is true. */
  inVehicle?: boolean;
  /** A target option whenever a target resource runs, whatever the owner picked (seats); else the prompt. */
  preferTarget?: boolean;
  /** Gets the object in question (0 when unknown). */
  canShow?: (entity: number) => boolean;
  /** Gets the object used. A returned promise blocks this resource's other points until it settles. */
  onPressed: (entity: number) => unknown;
}

/** A point on every vehicle (`Points.addVehicle`): ox_target's global vehicle option, or a prompt at the nearest one. */
export type VehiclePointOptions = Omit<
  ModelPointOptions,
  "models" | "vehicles"
>;

const SCAN_MS = 500;
/** Up to this many models a point asks GTA for the closest object of each; more models use the object index. */
const DIRECT_MODELS = 6;
/** Pool entries the object index reads per scan, so a big pool is spread over several scans. */
const INDEX_CHUNK = 300;
const scanning = new Set<ModelPoint>();

function schedule(): void {
  scanJob.set(scanning.size > 0);
}

/**
 * The objects whose model a many-model point wants (364 chair models, say): one closest-object query per model and
 * scan costs milliseconds, so the object pool is walked instead, a chunk per scan, and only matching objects are kept.
 */
class ObjectIndex {
  /** Matching objects found by the last complete walk. */
  candidates: number[] = [];
  private pool: number[] = [];
  private next = 0;
  private found: number[] = [];

  advance(wanted: Set<number>): void {
    if (this.next >= this.pool.length) {
      this.candidates = this.found;
      this.found = [];
      this.pool = GetGamePool("CObject") as number[];
      this.next = 0;
    }
    const end = Math.min(this.pool.length, this.next + INDEX_CHUNK);
    for (let i = this.next; i < end; i++) {
      const entity = this.pool[i] ?? 0;
      if (entity && wanted.has(GetEntityModel(entity))) this.found.push(entity);
    }
    this.next = end;
  }
}

const index = new ObjectIndex();
const indexed = new Set<number>();
/** While the player stands still (and stays in or out of a vehicle) a scan is skipped, but not more than this many in a row. */
const IDLE_SCANS = 6;
const last = { x: 0, y: 0, z: 0, inVehicle: false, idle: IDLE_SCANS };

/** Prompt mode: the nearest object of each point's models within its radius, two times a second. */
function scan(): void {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
  const inVehicle = cache.vehicle !== false;
  const still =
    inVehicle === last.inVehicle &&
    Math.hypot(x - last.x, y - last.y, z - last.z) < 1;
  if (still && ++last.idle < IDLE_SCANS) return;
  Object.assign(last, { x, y, z, inVehicle, idle: 0 });
  indexed.clear();
  for (const point of scanning) point.addIndexed(indexed, inVehicle);
  if (indexed.size) index.advance(indexed);
  for (const point of scanning) point.check(x, y, z, inVehicle);
}

const scanJob = every(SCAN_MS, scan, { active: false, name: "modelPoints" });

/**
 * A point on every world object of some models: a target option on the models in target mode, otherwise a prompt
 * while the player is near one of them (one scan job for the resource, only while such points exist).
 */
export class ModelPoint {
  private readonly hashes: number[];
  private readonly hashSet: Set<number>;
  private entity = 0;
  private shown: string | null = null;
  private attached = false;
  /** Every networked vehicle, whatever its model (`Points.addVehicle`). */
  private readonly global: boolean;

  constructor(
    readonly promptId: string,
    readonly options: ModelPointOptions,
  ) {
    this.hashes = options.models.map((m) =>
      typeof m === "number" ? m : GetHashKey(m),
    );
    this.hashSet = new Set(this.hashes);
    this.global = options.vehicles === true && options.models.length === 0;
  }

  attach(mode: Style): void {
    if (pointStyle(this.options, mode) === "target") {
      const option = {
        name: this.promptId,
        label: readLabel(this.options.label),
        icon: this.options.icon,
        distance: this.options.radius ?? 1.5,
        canInteract: (entity: unknown) =>
          readAllowed(
            this.options.canShow,
            typeof entity === "number" ? entity : 0,
          ),
        onSelect: (data: unknown) => {
          const entity =
            typeof data === "object" && data !== null
              ? Reflect.get(data, "entity")
              : 0;
          this.run(typeof entity === "number" ? entity : 0);
        },
      };
      if (this.global) target("addGlobalVehicle", [option]);
      else target("addModel", this.options.models, [option]);
      this.attached = true;
      return;
    }
    scanning.add(this);
    schedule();
  }

  detach(targetRunning: boolean): void {
    if (this.attached && targetRunning) {
      if (this.global) target("removeGlobalVehicle", this.promptId);
      else target("removeModel", this.options.models, this.promptId);
    }
    this.attached = false;
    scanning.delete(this);
    schedule();
    this.show(null);
    this.entity = 0;
  }

  /** Adds this point's models to the object index when it has too many to query one by one. */
  addIndexed(into: Set<number>, inVehicle: boolean): void {
    if (this.options.vehicles || this.hashes.length <= DIRECT_MODELS) return;
    if (inVehicle && !this.options.inVehicle) return;
    for (const hash of this.hashes) into.add(hash);
  }

  check(x: number, y: number, z: number, inVehicle: boolean): void {
    if (!this.options.vehicles && inVehicle && !this.options.inVehicle) {
      this.entity = 0;
      return this.show(null);
    }
    const radius = this.options.radius ?? 1.5;
    let found = this.options.vehicles
      ? this.nearestVehicle(x, y, z, radius)
      : this.hashes.length > DIRECT_MODELS
        ? this.nearestIndexed(x, y, z, radius)
        : 0;
    if (!this.options.vehicles && this.hashes.length <= DIRECT_MODELS)
      for (const hash of this.hashes) {
        found = GetClosestObjectOfType(
          x,
          y,
          z,
          radius,
          hash,
          false,
          false,
          false,
        );
        if (found) break;
      }
    this.entity = found;
    this.show(
      found && readAllowed(this.options.canShow, found)
        ? readLabel(this.options.label)
        : null,
    );
  }

  press(): void {
    if (this.entity) this.run(this.entity);
  }

  /** The nearest indexed object of this point's models within `radius`. */
  private nearestIndexed(x: number, y: number, z: number, radius: number) {
    let found = 0;
    let best = radius;
    for (const entity of index.candidates) {
      if (!DoesEntityExist(entity) || !this.hashSet.has(GetEntityModel(entity)))
        continue;
      const [ox = 0, oy = 0, oz = 0] = GetEntityCoords(entity, false);
      const dist = Math.hypot(ox - x, oy - y, oz - z);
      if (dist < best) [found, best] = [entity, dist];
    }
    return found;
  }

  /** The nearest vehicle of the models (any networked one for a global point) within `radius` (the vehicle pool is small). */
  private nearestVehicle(x: number, y: number, z: number, radius: number) {
    let found = 0;
    let best = radius;
    for (const vehicle of GetGamePool("CVehicle") as number[]) {
      if (
        this.global
          ? !NetworkGetEntityIsNetworked(vehicle)
          : !this.hashSet.has(GetEntityModel(vehicle))
      )
        continue;
      const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle, false);
      const dist = Math.hypot(vx - x, vy - y, vz - z);
      if (dist < best) [found, best] = [vehicle, dist];
    }
    return found;
  }

  private run(entity: number): void {
    runPress(
      () => readAllowed(this.options.canShow, entity),
      () => this.options.onPressed(entity),
    );
  }

  private show(text: string | null): void {
    if (text === this.shown) return;
    this.shown = text;
    if (text !== null) showPrompt(this.promptId, text);
    else hidePrompt(this.promptId);
  }
}
