import { cache } from "./cache";

/**
 * The closest vehicle within `metres` of the local player (the one the player sits in first, unless `notOwn`);
 * `networked` (default true) skips local-only vehicles (previews, props). 0 when none.
 */
export function nearestVehicle(
  metres: number,
  options: { networked?: boolean; notOwn?: boolean } = {},
): number {
  if (cache.vehicle !== false && !options.notOwn) return cache.vehicle;
  const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
  let best = 0;
  let bestDistance = metres;
  for (const vehicle of GetGamePool("CVehicle") as number[]) {
    if (vehicle === cache.vehicle && options.notOwn) continue;
    if (options.networked !== false && !NetworkGetEntityIsNetworked(vehicle))
      continue;
    const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle, false);
    const d = Math.hypot(vx - x, vy - y, vz - z);
    if (d < bestDistance) [best, bestDistance] = [vehicle, d];
  }
  return best;
}
