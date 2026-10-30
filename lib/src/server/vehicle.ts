import { CORE, VEHICLE_BAGS, type KeyPurpose } from "@aicore-fivem/shared";
import { waitFor, type VehicleProps, type VehicleSetup } from "../shared";
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
  /** Players put into other seats (0 front passenger, 1 and 2 the back...). */
  seats?: Array<{ source: number; seat: number }>;
  /** Stored look and tuning (a garage vehicle); the owner client applies them. */
  props?: VehicleProps;
  /** Fresh-vehicle extras: full tuning, colours, livery, tint, dirt, engine running. */
  setup?: VehicleSetup;
  /** Doors locked for everyone (keys unlock them). */
  locked?: boolean;
  /** Routing bucket the vehicle lives in (players put in it should be in the same one). */
  bucket?: number;
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

/** Puts a player into a seat, trying again while the new entity is not ready for it (up to 2 s). */
async function seatPlayer(
  vehicle: number,
  source: number,
  seat: number,
): Promise<boolean> {
  const ped = GetPlayerPed(String(source));
  if (!ped) return false;
  return waitFor(() => {
    if (!DoesEntityExist(vehicle)) return false;
    if (GetPedInVehicleSeat(vehicle, seat) === ped) return true;
    SetPedIntoVehicle(ped, vehicle, seat);
    return undefined;
  }, 2000, 150).catch(() => false);
}

/**
 * Creates a networked vehicle on the server (strict entity lockdown) and sets it up in one step: plate, fuel, state
 * bags, look (props / setup), lock, bucket, keys for its purpose, a driver and passengers. Resolves the entity, or null when the model does not exist or creation failed.
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
  if (options.bucket !== undefined)
    SetEntityRoutingBucket(vehicle, options.bucket);
  if (options.locked) SetVehicleDoorsLocked(vehicle, 2);
  const state = Entity(vehicle).state;
  if (options.fuel !== undefined)
    state.set(VEHICLE_BAGS.fuel, options.fuel, true);
  if (options.props) state.set(VEHICLE_BAGS.props, options.props, true);
  if (options.setup) state.set(VEHICLE_BAGS.setup, options.setup, true);
  for (const [key, value] of Object.entries(options.bags ?? {}))
    state.set(key, value, true);
  if (options.keysTo !== undefined)
    vehicleKeys.give(options.keysTo, vehicle, options.purpose ?? "temporary");
  const riders = [
    ...(options.driver !== undefined
      ? [{ source: options.driver, seat: -1 }]
      : []),
    ...(options.seats ?? []),
  ];
  await Promise.all(riders.map((r) => seatPlayer(vehicle, r.source, r.seat)));
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
