import type { ModelScanDef } from "./def";

/** Up to this many models a point asks GTA for the closest object of each; more models use the object index. */
const DIRECT_MODELS = 6;

export class Scan {
  readonly hashSet: Set<number>;
  /** Every networked vehicle, whatever its model (`Points.addVehicle`). */
  readonly global: boolean;
  readonly indexed: boolean;

  constructor(
    readonly def: ModelScanDef,
    readonly onNearest: (entity: number) => void,
    public entity: number,
  ) {
    this.hashSet = new Set(def.models);
    this.global = def.vehicles && def.models.length === 0;
    this.indexed = !def.vehicles && def.models.length > DIRECT_MODELS;
  }

  /** Object points rest while the player sits in a vehicle (unless `inVehicle`). */
  skipped(inVehicle: boolean): boolean {
    return inVehicle && !this.def.vehicles && !this.def.inVehicle;
  }
}

/** Something near the player this scan: entity, model, distance. */
export interface Near {
  entity: number;
  model: number;
  dist: number;
}

/** The nearest of `near` that this point takes (its models, or any networked vehicle for a global one) within its radius. */
export function nearestOf(near: Near[], scan: Scan): number {
  let found = 0;
  let best = scan.def.radius;
  for (const item of near) {
    if (item.dist >= best) continue;
    if (
      scan.global
        ? !NetworkGetEntityIsNetworked(item.entity)
        : !scan.hashSet.has(item.model)
    )
      continue;
    found = item.entity;
    best = item.dist;
  }
  return found;
}

/** A point with few models asks GTA for the closest object of each. */
export function closestObject(x: number, y: number, z: number, scan: Scan): number {
  for (const hash of scan.def.models) {
    const found = GetClosestObjectOfType(
      x,
      y,
      z,
      scan.def.radius,
      hash,
      false,
      false,
      false,
    );
    if (found) return found;
  }
  return 0;
}
