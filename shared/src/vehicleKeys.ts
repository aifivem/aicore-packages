/** A vehicle as key systems know it: the server entity (when it exists), its network id and its trimmed plate. */
export interface KeyTarget {
  vehicle: number | null;
  netId: number | null;
  plate: string;
}

/**
 * One key system behind ai-core's vehicle key layer (server side). A system with only a client API is reached through
 * ai-core's client (`clientKeys` adapters); then `give` / `remove` forward to the player's client.
 */
export interface VehicleKeysAdapter {
  resource: string;
  give(source: number, target: KeyTarget): void;
  remove(source: number, target: KeyTarget): void;
  /** Absent when the system cannot answer: ai-core then counts the key as held. */
  has?(source: number, target: KeyTarget): boolean;
}

/** The client half of a key system that only has a client API. */
export interface VehicleKeysClientAdapter {
  resource: string;
  give(vehicle: number, plate: string): void;
  remove(vehicle: number, plate: string): void;
}

/** GlobalState key holding the resource name of the active key system (null while none runs). */
export const VEHICLE_KEYS_STATE_KEY = "ai:vehicleKeys";
/** Server -> client: ("give" | "remove", netId, plate) for key systems with a client API only. */
export const VEHICLE_KEYS_CLIENT_EVENT = "ai-core:client:vehicleKeys";

/** ai-core's vehicle key exports: a vehicle is a server entity handle or a plate. */
export type VehicleKeysServerExports = {
  GiveVehicleKeys(source: number, vehicle: number | string): void;
  RemoveVehicleKeys(source: number, vehicle: number | string): void;
  HasVehicleKeys(source: number, vehicle: number | string): boolean;
};
