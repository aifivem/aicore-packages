import { VEHICLE_BAGS } from "@aicore-fivem/shared";
import { EntityState, stateNumber } from "../fivem/state";

/** The `fuel` bag mirror, made on first use: a resource that never reads fuel adds no state bag handler. */
let bag: EntityState<number> | null = null;

/**
 * A vehicle's fuel on the client through ai-core's fuel layer: the server keeps the `fuel` bag for every fuel script
 * (a mirror for scripts that live on clients), so this is a memory read; the game's tank level without one.
 */
export const fuel = {
  /** 0-100 for a vehicle this client knows. */
  get(vehicle: number): number {
    bag ??= new EntityState(VEHICLE_BAGS.fuel, stateNumber);
    return bag.get(vehicle) ?? GetVehicleFuelLevel(vehicle);
  },
};
