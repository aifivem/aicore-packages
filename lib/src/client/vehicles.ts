import { cache } from "./cache";

/**
 * The closest vehicle within `metres` of the local player (the one the player sits in first, unless `notOwn`);
 * `networked` (default true) skips local-only vehicles (previews, props); `filter` skips vehicles it refuses (the
 * closest one the player stands behind, not merely the closest). 0 when none.
 */
export function nearestVehicle(
  metres: number,
  options: {
    networked?: boolean;
    notOwn?: boolean;
    filter?: (vehicle: number) => boolean;
  } = {},
): number {
  const { filter } = options;
  if (cache.vehicle !== false && !options.notOwn) {
    if (!filter || filter(cache.vehicle)) return cache.vehicle;
  }
  const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
  let best = 0;
  let bestDistance = metres;
  for (const vehicle of GetGamePool("CVehicle") as number[]) {
    if (vehicle === cache.vehicle) continue;
    if (options.networked !== false && !NetworkGetEntityIsNetworked(vehicle))
      continue;
    const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle, false);
    const d = Math.hypot(vx - x, vy - y, vz - z);
    if (d < bestDistance && (!filter || filter(vehicle)))
      [best, bestDistance] = [vehicle, d];
  }
  return best;
}
