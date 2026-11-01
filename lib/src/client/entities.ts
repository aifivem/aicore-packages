import type { Vec3 } from "../shared/vec";
import { cache } from "./cache";

/** A game entity pool (`GetGamePool`). */
export type EntityKind = "ped" | "object" | "vehicle";

const POOLS: Record<EntityKind, string> = {
  ped: "CPed",
  object: "CObject",
  vehicle: "CVehicle",
};

/** The closest entity and its distance in metres. */
export interface NearestEntity {
  entity: number;
  distance: number;
}

/**
 * The closest ped / object / vehicle to `from` (default the local ped) within `maxDistance` (default no limit) that
 * passes `filter`, with its distance; null when none. Peds skip the local ped unless `ignoreLocal: false`. Every
 * entity of the pool, local ones included; one `GetGamePool` walk per call (for actions, not ticks).
 */
export function nearestEntity(
  kind: EntityKind,
  from?: Vec3,
  maxDistance = Infinity,
  options: { filter?: (entity: number) => boolean; ignoreLocal?: boolean } = {},
): NearestEntity | null {
  let x: number;
  let y: number;
  let z: number;
  if (from) ({ x, y, z } = from);
  else [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
  const skip = kind === "ped" && options.ignoreLocal !== false ? cache.ped : 0;
  const { filter } = options;
  let best = 0;
  let bestSq = maxDistance * maxDistance;
  for (const entity of GetGamePool(POOLS[kind]) as number[]) {
    if (entity === skip) continue;
    const [ex = 0, ey = 0, ez = 0] = GetEntityCoords(entity, false);
    const dx = ex - x;
    const dy = ey - y;
    const dz = ez - z;
    const sq = dx * dx + dy * dy + dz * dz;
    if (sq < bestSq && (!filter || filter(entity))) {
      best = entity;
      bestSq = sq;
    }
  }
  return best ? { entity: best, distance: Math.sqrt(bestSq) } : null;
}

/** Every ped / object / vehicle within `radius` metres of `coords` (the local ped included); one pool walk. */
export function entitiesInArea(
  kind: EntityKind,
  coords: Vec3,
  radius: number,
): number[] {
  const out: number[] = [];
  const max = radius * radius;
  for (const entity of GetGamePool(POOLS[kind]) as number[]) {
    const [ex = 0, ey = 0, ez = 0] = GetEntityCoords(entity, false);
    const dx = ex - coords.x;
    const dy = ey - coords.y;
    const dz = ez - coords.z;
    if (dx * dx + dy * dy + dz * dz <= max) out.push(entity);
  }
  return out;
}

/** No vehicle stands within `radius` metres of `coords` (a spawn spot is free); stops at the first one found. */
export function isSpawnClear(coords: Vec3, radius: number): boolean {
  const max = radius * radius;
  for (const vehicle of GetGamePool("CVehicle") as number[]) {
    const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle, false);
    const dx = vx - coords.x;
    const dy = vy - coords.y;
    const dz = vz - coords.z;
    if (dx * dx + dy * dy + dz * dz <= max) return false;
  }
  return true;
}
