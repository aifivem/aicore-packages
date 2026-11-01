import { VEHICLE_BAGS, type KeyPurpose } from "@aicore-fivem/shared";
import { waitFor, type VehicleProps, type VehicleSetup } from "../../shared";
import { fuel } from "../fuel";
import { vehicleKeys } from "../vehicleKeys";
import { randomPlate } from "./plate";
import { modelHash, vehicleType } from "./vehicleType";

export interface SpawnVehicleOptions {
  /** Model name or hash. */
  model: string | number;
  coords: { x: number; y: number; z: number; heading: number };
  /** A player whose client tells the spawn type (and whether the model exists); without it `type` or "automobile". */
  asker?: number;
  /** `CreateVehicleServerSetter` type when no `asker` is given ("automobile", "bike", "boat", "heli", "plane"...). */
  type?: string;
  /** Up to 8 characters. */
  plate?: string;
  /** 0-100, set through ai-core's fuel layer (lib `fuel`). */
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

/** Puts a player into a seat, trying again while the new entity is not ready for it (up to 2 s). */
async function seatPlayer(
  vehicle: number,
  source: number,
  seat: number,
): Promise<boolean> {
  const ped = GetPlayerPed(String(source));
  if (!ped) return false;
  return waitFor(
    () => {
      if (!DoesEntityExist(vehicle)) return false;
      if (GetPedInVehicleSeat(vehicle, seat) === ped) return true;
      SetPedIntoVehicle(ped, vehicle, seat);
      return undefined;
    },
    2000,
    150,
  ).catch(() => false);
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
    modelHash(options.model),
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
  // The server reads the plate only after the owner client's first sync: the plate is always set here (a random one
  // when none is given), so keys never go to an empty plate.
  const plate = (options.plate ?? randomPlate()).slice(0, 8);
  SetVehicleNumberPlateText(vehicle, plate);
  if (options.bucket !== undefined)
    SetEntityRoutingBucket(vehicle, options.bucket);
  if (options.locked) SetVehicleDoorsLocked(vehicle, 2);
  const state = Entity(vehicle).state;
  // Through ai-core's fuel layer: a fuel script that keeps fuel on clients gets it from the entity's owner.
  if (options.fuel !== undefined) fuel.set(vehicle, options.fuel);
  if (options.props) state.set(VEHICLE_BAGS.props, options.props, true);
  if (options.setup) state.set(VEHICLE_BAGS.setup, options.setup, true);
  for (const [key, value] of Object.entries(options.bags ?? {}))
    state.set(key, value, true);
  if (options.keysTo !== undefined) {
    const synced = await waitFor(
      () =>
        !DoesEntityExist(vehicle) ||
        GetVehicleNumberPlateText(vehicle).trim() === plate.trim() ||
        undefined,
      3000,
    ).catch(() => false);
    vehicleKeys.give(
      options.keysTo,
      synced && DoesEntityExist(vehicle) ? vehicle : plate.trim(),
      options.purpose ?? "temporary",
    );
  }
  const riders = [
    ...(options.driver !== undefined
      ? [{ source: options.driver, seat: -1 }]
      : []),
    ...(options.seats ?? []),
  ];
  await Promise.all(riders.map((r) => seatPlayer(vehicle, r.source, r.seat)));
  return vehicle;
}
