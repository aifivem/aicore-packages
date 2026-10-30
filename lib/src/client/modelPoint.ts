import { cache } from "./cache";
import {
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
const scanning = new Set<ModelPoint>();
let timer: ReturnType<typeof setInterval> | null = null;

function schedule(): void {
  if (scanning.size && !timer) timer = setInterval(scan, SCAN_MS);
  else if (!scanning.size && timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** Prompt mode: the nearest object of each point's models within its radius, two times a second. */
function scan(): void {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
  for (const point of scanning) point.check(x, y, z);
}

/**
 * A point on every world object of some models: a target option on the models in target mode, otherwise a prompt
 * while the player is near one of them (one scan timer for the resource, only while such points exist).
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
    if (mode === "target") {
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

  check(x: number, y: number, z: number): void {
    const radius = this.options.radius ?? 1.5;
    let found = this.options.vehicles
      ? this.nearestVehicle(x, y, z, radius)
      : 0;
    if (!this.options.vehicles)
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
