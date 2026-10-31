import type { Vec3 } from "../shared/vec";

/** An entity's position (server copy of the owner's sync). */
export function entityCoords(entity: number): Vec3 {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(entity);
  return { x, y, z };
}

/** A player's ped position. */
export const coordsOf = (source: number): Vec3 =>
  entityCoords(GetPlayerPed(String(source)));

/** The vehicle the player sits in (with `driver: true` only when in its driver seat), 0 on foot. */
export function vehicleOf(
  source: number,
  options: { driver?: boolean } = {},
): number {
  const ped = GetPlayerPed(String(source));
  const vehicle = GetVehiclePedIsIn(ped, false);
  if (!vehicle || !options.driver) return vehicle;
  return GetPedInVehicleSeat(vehicle, -1) === ped ? vehicle : 0;
}

/** The player's ped is within `metres` of a point. */
export function isNear(source: number, point: Vec3, metres: number): boolean {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
  const dx = x - point.x;
  const dy = y - point.y;
  const dz = z - point.z;
  return dx * dx + dy * dy + dz * dz <= metres * metres;
}
