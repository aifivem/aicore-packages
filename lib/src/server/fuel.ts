import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** A vehicle's fuel (0-100) through ai-core's fuel layer, whatever fuel script runs (ai-fuel, ox_fuel, LegacyFuel...). */
export const fuel = {
  /** The level of a vehicle (server entity), null when it has none. */
  get: (vehicle: number): number | null => core.GetVehicleFuel(vehicle),
  /** Sets the level (clamped to 0-100); false for a wrong vehicle. */
  set: (vehicle: number, level: number): boolean =>
    core.SetVehicleFuel(vehicle, level),
  /** The fuel script that answers, or null when none runs. */
  provider: (): string | null => core.GetFuelSystem(),
};
