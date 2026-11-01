import { vehicleFromNet } from "../netEntity";

/**
 * The closest vehicle within `metres` of a point (a spawn spot is free...) that passes `filter`; 0 when none. Walks
 * every vehicle: for actions, not ticks.
 */
export function nearestVehicleAt(
  point: { x: number; y: number; z: number },
  metres: number,
  filter?: (vehicle: number) => boolean,
): number {
  let best = 0;
  let bestDistance = metres;
  for (const vehicle of GetAllVehicles() as number[]) {
    const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle);
    const d = Math.hypot(vx - point.x, vy - point.y, vz - point.z);
    if (d < bestDistance && (!filter || filter(vehicle)))
      [best, bestDistance] = [vehicle, d];
  }
  return best;
}

/**
 * The closest vehicle within `metres` of a player (the one the player sits in first) that passes `filter` (locked
 * doors, a model...); 0 when none. Walks every vehicle: for commands and actions, not ticks.
 */
export function nearestVehicleTo(
  source: number,
  metres: number,
  filter?: (vehicle: number) => boolean,
): number {
  const ped = GetPlayerPed(String(source));
  const own = GetVehiclePedIsIn(ped, false);
  if (own && (!filter || filter(own))) return own;
  const [x = 0, y = 0, z = 0] = GetEntityCoords(ped);
  let best = 0;
  let bestDistance = metres;
  for (const vehicle of GetAllVehicles() as number[]) {
    const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle);
    const d = Math.hypot(vx - x, vy - y, vz - z);
    if (d < bestDistance && (!filter || filter(vehicle)))
      [best, bestDistance] = [vehicle, d];
  }
  return best;
}

/**
 * The vehicle behind a client's network id when the player is near it: within `metres` (default 5) of it, or, with
 * `driver: true`, in its driver seat. 0 otherwise.
 */
export function vehicleNearPlayer(
  source: number,
  netId: unknown,
  options: { metres?: number; driver?: boolean } = {},
): number {
  const vehicle = vehicleFromNet(netId);
  if (!vehicle) return 0;
  const ped = GetPlayerPed(String(source));
  if (options.driver)
    return GetPedInVehicleSeat(vehicle, -1) === ped ? vehicle : 0;
  const [px = 0, py = 0, pz = 0] = GetEntityCoords(ped);
  const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle);
  return Math.hypot(vx - px, vy - py, vz - pz) <= (options.metres ?? 5)
    ? vehicle
    : 0;
}
