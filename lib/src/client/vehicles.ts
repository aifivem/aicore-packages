import type { Vec3 } from "../shared/vec";
import { cache } from "./cache";

/**
 * The closest vehicle within `metres` of the local player (the one the player sits in first, unless `notOwn`) or of
 * `from` (a point: only distance counts, the player's own vehicle included unless `notOwn`); `networked` (default
 * true) skips local-only vehicles (previews, props); `filter` skips vehicles it refuses (the closest one the player
 * stands behind, not merely the closest). 0 when none. Its distance: `nearestEntity("vehicle", ...)`.
 */
export function nearestVehicle(
  metres: number,
  options: {
    networked?: boolean;
    notOwn?: boolean;
    filter?: (vehicle: number) => boolean;
    from?: Vec3;
  } = {},
): number {
  const { filter, from } = options;
  // The own vehicle is preferred only when measuring from the player; it is skipped in the walk when it was offered.
  const skipOwn = options.notOwn || !from;
  if (cache.vehicle !== false && !options.notOwn && !from) {
    if (!filter || filter(cache.vehicle)) return cache.vehicle;
  }
  let x: number;
  let y: number;
  let z: number;
  if (from) ({ x, y, z } = from);
  else [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
  let best = 0;
  let bestDistance = metres;
  for (const vehicle of GetGamePool("CVehicle") as number[]) {
    if (skipOwn && vehicle === cache.vehicle) continue;
    if (options.networked !== false && !NetworkGetEntityIsNetworked(vehicle))
      continue;
    const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle, false);
    const d = Math.hypot(vx - x, vy - y, vz - z);
    if (d < bestDistance && (!filter || filter(vehicle)))
      [best, bestDistance] = [vehicle, d];
  }
  return best;
}

/** The vehicle the local player drives (driver seat), false otherwise. */
export const drivenVehicle = (): number | false =>
  cache.seat === -1 ? cache.vehicle : false;
