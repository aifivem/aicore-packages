import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Vehicle keys of the local player through ai-core's client key layer. */
export const vehicleKeys = {
  /**
   * Whether the player holds a vehicle's keys (entity or plate), from ai-core's short-lived mirror of the server's
   * answers: a vehicle the player never entered answers false once while ai-core asks the server.
   */
  has: (vehicle: number | string): boolean =>
    core.HasVehicleKeys(vehicle) === true,
};
