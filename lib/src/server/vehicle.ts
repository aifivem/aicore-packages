import { CORE, VEHICLE_BAGS, type KeyPurpose } from "@aicore-fivem/shared";
import { waitFor } from "../shared";
import { triggerClientCallback } from "./callback";
import { vehicleKeys } from "./vehicleKeys";

export interface SpawnVehicleOptions {
  model: string;
  coords: { x: number; y: number; z: number; heading: number };
  /** A player whose client tells the spawn type (and whether the model exists); without it `type` or "automobile". */
  asker?: number;
  /** `CreateVehicleServerSetter` type when no `asker` is given ("automobile", "bike", "boat", "heli", "plane"...). */
  type?: string;
  /** Up to 8 characters. */
  plate?: string;
  /** 0-100 into the `fuel` state bag. */
  fuel?: number;
  /** A player who gets the keys through ai-core's key layer, for `purpose` (default `temporary`). */
  keysTo?: number;
  purpose?: KeyPurpose;
  /** A player put into the driver seat. */
  driver?: number;
  /** Orphan mode 2: the vehicle stays when its owner leaves (default true). */
  persistent?: boolean;
  /** Replicated state bag values set right after creation. */
  bags?: Record<string, unknown>;
}

/** Every type `CreateVehicleServerSetter` takes; a client answering anything else is ignored. */
const TYPES = new Set([
  "automobile",
  "bike",
  "boat",
  "heli",
  "plane",
  "submarine",
  "trailer",
  "train",
]);
/** Model -> spawn type, learned from clients once per model (the server cannot read a vehicle class). */
const types = new Map<string, string>();

/**
 * The `CreateVehicleServerSetter` type of a model asked from a player's client (ai-core answers); null: no such
 * vehicle. Only a valid type is cached: "no such model" is asked again, so one modified client cannot block a model.
 */
export async function vehicleType(
  model: string,
  asker: number,
): Promise<string | null> {
  const known = types.get(model);
  if (known !== undefined) return known;
  const answer = await triggerClientCallback(CORE.vehicleTypeCallback, asker, [
    model,
  ]).catch(() => null);
  if (typeof answer !== "string" || !TYPES.has(answer)) return null;
  types.set(model, answer);
  return answer;
}

/**
 * Creates a networked vehicle on the server (strict entity lockdown) and sets it up in one step: plate, fuel, state
 * bags, keys for its purpose, a driver. Resolves the entity, or null when the model does not exist or creation failed.
 */
export async function spawnVehicle(
  options: SpawnVehicleOptions,
): Promise<number | null> {
  const type =
    options.asker !== undefined
      ? await vehicleType(options.model, options.asker)
      : (options.type ?? "automobile");
  if (!type) return null;
  const { x, y, z, heading } = options.coords;
  const vehicle = CreateVehicleServerSetter(
    GetHashKey(options.model),
    type,
    x,
    y,
    z,
    heading,
  );
  if (
    !(await waitFor(() => DoesEntityExist(vehicle) || undefined, 5000).catch(
      () => false,
    ))
  )
    return null;
  if (options.persistent !== false) SetEntityOrphanMode(vehicle, 2);
  if (options.plate)
    SetVehicleNumberPlateText(vehicle, options.plate.slice(0, 8));
  const state = Entity(vehicle).state;
  if (options.fuel !== undefined)
    state.set(VEHICLE_BAGS.fuel, options.fuel, true);
  for (const [key, value] of Object.entries(options.bags ?? {}))
    state.set(key, value, true);
  if (options.driver !== undefined)
    SetPedIntoVehicle(GetPlayerPed(String(options.driver)), vehicle, -1);
  if (options.keysTo !== undefined)
    vehicleKeys.give(options.keysTo, vehicle, options.purpose ?? "temporary");
  return vehicle;
}

/** The closest vehicle within `metres` of a player (the one the player sits in first); 0 when none. Walks every vehicle: for commands and actions, not ticks. */
export function nearestVehicleTo(source: number, metres: number): number {
  const ped = GetPlayerPed(String(source));
  const own = GetVehiclePedIsIn(ped, false);
  if (own) return own;
  const [x = 0, y = 0, z = 0] = GetEntityCoords(ped);
  let best = 0;
  let bestDistance = metres;
  for (const vehicle of GetAllVehicles() as number[]) {
    const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle);
    const d = Math.hypot(vx - x, vy - y, vz - z);
    if (d < bestDistance) [best, bestDistance] = [vehicle, d];
  }
  return best;
}
