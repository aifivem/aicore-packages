import { isRecord } from "../../shared";
import { readFinite } from "../../shared/strict";
import { CELL, MOVE_MARGIN } from "./objectIndex";

/** What the scan needs of a model point (its label, `canShow` and action stay with the owner). */
export interface ModelScanDef {
  /** Model hashes; none with `vehicles` = every networked vehicle. */
  models: number[];
  /** The models are vehicles: the vehicle pool is walked instead of objects. */
  vehicles: boolean;
  radius: number;
  /** Object points are skipped while the player sits in a vehicle unless this is true. */
  inVehicle: boolean;
}

/** A definition from another resource (ai-lib's export); null when malformed. */
export function readModelScanDef(value: unknown): ModelScanDef | null {
  if (!isRecord(value) || !Array.isArray(value.models)) return null;
  const models = value.models.filter((m): m is number => Number.isInteger(m));
  const radius = readFinite(value.radius);
  if (radius === null || radius <= 0 || radius > CELL - MOVE_MARGIN)
    return null;
  return {
    models,
    vehicles: value.vehicles === true,
    radius,
    inVehicle: value.inVehicle === true,
  };
}
