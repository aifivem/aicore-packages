import {
  CORE,
  toGaragedVehicles,
  type GaragedVehicle,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Garages through ai-core's garage layer, whatever garage script runs; each script answers only what it exposes. */
export const garages = {
  /** Sends a vehicle (server entity) to the impound, or opens the script's impound form for `by`; false when nothing took it (delete it yourself). */
  impound: (vehicle: number, by?: number): boolean =>
    core.ImpoundVehicle(vehicle, by),
  /** Stores a vehicle in a garage (`garage` = the script's garage id); false when nothing took it. */
  store: (vehicle: number, garage?: string | null, by?: number): boolean =>
    core.StoreVehicleInGarage(vehicle, garage ?? null, by),
  /** Opens the garage menu of the active script for a player; false when it has none. */
  open: (source: number, garage?: string | null): boolean =>
    core.OpenGarage(source, garage ?? null),
  /** A player's vehicles in garages or the impound; null when the script cannot tell or ai-core is stopped. */
  stored: (source: number): Promise<GaragedVehicle[] | null> =>
    new Promise((resolve) => {
      try {
        core.GetGaragedVehicles(source, (list) =>
          resolve(toGaragedVehicles(list)),
        );
      } catch {
        resolve(null);
      }
    }),
  /** The garage script that answers, or null when none runs. */
  provider: (): string | null => core.GetGarageSystem(),
};
