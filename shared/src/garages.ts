/**
 * ai-core's garage layer: impound, store, open a garage menu and list a player's garaged vehicles through whichever
 * garage script runs (ai-garages, tgiann-realparking, jg-advancedgarages...). Each script answers only what it really
 * exposes. `docs/compat/garages.md`.
 */

/** GlobalState key: the resource name of the garage script behind the garage layer (unset while none runs). */
export const GARAGES_STATE_KEY = "ai:garages";
/** Server -> client: ("open" | "store" | "impound", netId | null, garage | null) for garage scripts with a client API. */
export const GARAGES_CLIENT_EVENT = "ai-core:client:garages";

/** One of a player's vehicles kept by a garage script. */
export interface GaragedVehicle {
  plate: string;
  /** Spawn name when the script knows it. */
  model: string | null;
  /** The script's garage id; null when it has none (impound, a script without garage ids). */
  garage: string | null;
  impounded: boolean;
}

/** One garage script on ai-core's server (`resource/server/garages/`): every action is optional. */
export interface GarageAdapter {
  resource: string;
  version?: string;
  /** Meant to run next to ai-garages (a parking or valet script that does not replace it). */
  besideOurs?: boolean;
  /**
   * Sends a vehicle in the world to the impound, or opens the script's impound form for `by` (scripts with a client
   * form only); true when the script took it over.
   */
  impound?(vehicle: number, plate: string, by: number | null): boolean;
  /** Puts a vehicle in the world into a garage (`garage` null = the script's own pick); true when it took it. */
  store?(
    vehicle: number,
    plate: string,
    garage: string | null,
    by: number | null,
  ): boolean;
  /** Opens the script's garage menu for a player; false when it cannot. */
  open?(source: number, garage: string | null): boolean;
  /** A player's vehicles in garages or the impound; null when the script cannot tell. */
  stored?(source: number): Promise<GaragedVehicle[] | null>;
}

/** The client half of a garage script with a client API (`resource/client/garages/`). */
export interface GarageClientAdapter {
  resource: string;
  open?(garage: string | null): void;
  store?(vehicle: number, garage: string | null): void;
  impound?(vehicle: number): void;
}

/** ai-core's garage exports (lib `garages`): a vehicle is a server entity handle. */
export type GaragesServerExports = {
  /** The garage script the layer forwards to, or null. */
  GetGarageSystem(): string | null;
  /** Impounds a vehicle (`by`: the player acting, for scripts with an impound form); false when nothing took it. */
  ImpoundVehicle(vehicle: number, by?: number): boolean;
  /** Stores a vehicle in a garage (null = the script's pick); false when nothing took it. */
  StoreVehicleInGarage(
    vehicle: number,
    garage?: string | null,
    by?: number,
  ): boolean;
  /** Opens the garage menu of the active script for a player; false when it has none. */
  OpenGarage(source: number, garage?: string | null): boolean;
  /** A player's garaged vehicles; `done` gets them, or null. A callback: no promise crosses a resource boundary. */
  GetGaragedVehicles(
    source: number,
    done: (vehicles: GaragedVehicle[] | null) => void,
  ): void;
};

/** ai-garages' own server exports (ai-core's garage adapter uses them; scripts use lib `garages`). */
export type AiGaragesServerExports = {
  /** An owned vehicle goes to the impound (its entity removed); false when ai-vehicles does not own it. */
  ImpoundVehicle(vehicle: number): boolean;
  /** An owned vehicle goes into one of the panel's garages with its condition; false for a wrong garage or vehicle. */
  StoreVehicle(vehicle: number, garage: string): boolean;
  /** The player's character vehicles in a garage or the impound. */
  GetStoredVehicles(source: number): GaragedVehicle[];
};

/** A garaged vehicle list from another resource, null when the shape is wrong. */
export function toGaragedVehicles(raw: unknown): GaragedVehicle[] | null {
  if (!Array.isArray(raw)) return null;
  const list: GaragedVehicle[] = [];
  for (const v of raw) {
    if (typeof v !== "object" || v === null) continue;
    const r = v as Record<string, unknown>;
    if (typeof r.plate !== "string") continue;
    list.push({
      plate: r.plate,
      model: typeof r.model === "string" ? r.model : null,
      garage: typeof r.garage === "string" ? r.garage : null,
      impounded: r.impounded === true,
    });
  }
  return list;
}
