import type { Vec3 } from "../../../shared/vec";

/**
 * The target scripts lib `Points` put their options on, one adapter each, in the order they win when several run
 * (`docs/compat/target.md`). The calls run in the resource that owns the points: every target ties an option's
 * functions to the calling resource and drops them when it stops, so they never go through ai-core.
 */

/** One target option in the lib's terms; each adapter turns it into its script's shape. */
export interface TargetOption {
  /** Unique across resources (`<resource>:<prompt id>`): some targets remove by it from one shared list. */
  name: string;
  label: string;
  icon?: string;
  /** How close the player must be, in metres. */
  distance: number;
  canInteract(entity: number): boolean;
  onSelect(entity: number): void;
}

/** The calls `Points` make on a target script; any of them throws "No such export" while that script loads. */
export interface TargetAdapter {
  /** False when it cannot take an option at a bare point from JavaScript (it needs a Lua vector3): such points stay prompts. */
  readonly coords: boolean;
  /** An option on a spot `radius` metres wide at `coords`; returns the handle `removeZone` takes. */
  addSphere(coords: Vec3, radius: number, option: TargetOption): unknown;
  removeZone(handle: unknown, option: TargetOption): void;
  addLocalEntity(entity: number, option: TargetOption): void;
  removeLocalEntity(entity: number, option: TargetOption): void;
  addModels(models: Array<string | number>, option: TargetOption): void;
  removeModels(models: Array<string | number>, option: TargetOption): void;
  addGlobalVehicle(option: TargetOption): void;
  removeGlobalVehicle(option: TargetOption): void;
}

export interface Target {
  /** The resource whose started state picks this target. */
  resource: string;
  adapter: TargetAdapter;
}
