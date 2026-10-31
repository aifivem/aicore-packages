/**
 * ai-core's fuel layer: a vehicle's fuel (0-100) through whichever fuel script runs (ai-fuel, ox_fuel, LegacyFuel...).
 * `docs/compat/fuel.md`.
 */

/** GlobalState key: the resource name of the fuel script behind the fuel layer (unset while none runs). */
export const FUEL_STATE_KEY = "ai:fuel";
/**
 * Vehicle state bag: a level the server set for a fuel script that keeps fuel on the clients, waiting for the entity's
 * owner client to put it into that script (cleared when a client reports the level back).
 */
export const FUEL_PENDING_BAG = "ai:fuelSet";
/**
 * Client -> server: (netId, level) the level a client-side fuel script holds for a vehicle near the player: the
 * driver's at every whole percent, the owner's right after it applied `FUEL_PENDING_BAG`.
 */
export const FUEL_REPORT_EVENT = "ai-core:fuelReport";

/** One fuel script on ai-core's server (`resource/server/fuel/`). */
export interface FuelAdapter {
  resource: string;
  version?: string;
  /** Meant to run next to ai-fuel (never true for a fuel script: two burn the same tank). */
  besideOurs?: boolean;
  /** The script keeps fuel on the clients: ai-core mirrors it into the `fuel` bag from client reports. */
  mirrored?: boolean;
  /** 0-100, null when the vehicle has no level yet. */
  get(vehicle: number): number | null;
  set(vehicle: number, level: number): void;
}

/** The client half of a fuel script that keeps fuel on the clients (`resource/client/fuel/`). */
export interface FuelClientAdapter {
  resource: string;
  /** 0-100 as the script holds it for a vehicle this client knows; null when it cannot tell. */
  get(vehicle: number): number | null;
  set(vehicle: number, level: number): void;
}

/** ai-core's fuel exports (lib `fuel`): a vehicle is a server entity handle. */
export type FuelServerExports = {
  /** The fuel script the fuel layer forwards to, or null. */
  GetFuelSystem(): string | null;
  /** 0-100, null for a vehicle without a level (or no vehicle). */
  GetVehicleFuel(vehicle: number): number | null;
  /** Sets the level (clamped to 0-100); false for a wrong vehicle or level. */
  SetVehicleFuel(vehicle: number, level: number): boolean;
};
