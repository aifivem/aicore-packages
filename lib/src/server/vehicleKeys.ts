import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = () => resourceExport(CORE.resource);

/**
 * Vehicle keys through ai-core's key layer: the active key system (ai-vehiclekeys, or another the panel picks) answers.
 * A vehicle is a server entity handle or a plate.
 */
export const vehicleKeys = {
  /** Gives a player the keys of a vehicle. */
  give: (source: number, vehicle: number | string): void => core().GiveVehicleKeys(source, vehicle),
  /** Takes a player's keys of a vehicle. */
  remove: (source: number, vehicle: number | string): void => core().RemoveVehicleKeys(source, vehicle),
  /** Whether a player holds the keys; true when the key system cannot tell or none runs. */
  has: (source: number, vehicle: number | string): boolean => core().HasVehicleKeys(source, vehicle),
};
