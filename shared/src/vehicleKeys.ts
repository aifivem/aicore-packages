/** A vehicle as key systems know it: the server entity (when it exists), its network id and its trimmed plate. */
export interface KeyTarget {
  vehicle: number | null;
  netId: number | null;
  plate: string;
}

/**
 * Why a player gets a vehicle's key; key systems treat each one differently (tgiann-hotwire: a bought vehicle gets a
 * new key item, a garage vehicle its stored ignition state, a job or rented vehicle a key fixed in the ignition).
 * - `purchase`: the player now owns the vehicle (dealer, admin give): a new key, older copies stop working.
 * - `garage`: an owned vehicle taken out of storage: the owner already has the key.
 * - `job`: a work vehicle for the shift.
 * - `rental`: a rented vehicle for the rental time.
 * - `temporary`: anything else short-lived (admin spawn, test drive, robbery vehicle); the default.
 */
export type KeyPurpose = "purchase" | "garage" | "job" | "rental" | "temporary";
export const KEY_PURPOSES: readonly KeyPurpose[] = [
  "purchase",
  "garage",
  "job",
  "rental",
  "temporary",
];

/** A purpose from untrusted input; `temporary` for anything else. */
export function toKeyPurpose(value: unknown): KeyPurpose {
  return KEY_PURPOSES.find((p) => p === value) ?? "temporary";
}

/**
 * One key system behind ai-core's vehicle key layer (server side). A system with only a client API is reached through
 * ai-core's client (`clientKeys` adapters); then `give` / `remove` forward to the player's client.
 */
export interface VehicleKeysAdapter {
  resource: string;
  give(source: number, target: KeyTarget, purpose: KeyPurpose): void;
  remove(source: number, target: KeyTarget): void;
  /** Absent when the system cannot answer: ai-core then counts the key as held. */
  has?(source: number, target: KeyTarget): boolean;
}

/** The client half of a key system that only has a client API. */
export interface VehicleKeysClientAdapter {
  resource: string;
  give(vehicle: number, plate: string, purpose: KeyPurpose): void;
  remove(vehicle: number, plate: string): void;
}

/** GlobalState key holding the resource name of the active key system (null while none runs). */
export const VEHICLE_KEYS_STATE_KEY = "ai:vehicleKeys";
/** Server -> client: ("give" | "remove", netId, plate, purpose) for key systems with a client API only. */
export const VEHICLE_KEYS_CLIENT_EVENT = "ai-core:client:vehicleKeys";

/** ai-core's vehicle key exports: a vehicle is a server entity handle or a plate; `purpose` defaults to `temporary`. */
export type VehicleKeysServerExports = {
  GiveVehicleKeys(
    source: number,
    vehicle: number | string,
    purpose?: KeyPurpose,
  ): void;
  RemoveVehicleKeys(source: number, vehicle: number | string): void;
  HasVehicleKeys(source: number, vehicle: number | string): boolean;
};

/** Client -> server callback `(netId | plate)`: whether the local player holds that vehicle's keys (the server layer's answer). */
export const VEHICLE_KEYS_HAS_CALLBACK = "ai-core:vehicleKeys:has";
/** Server -> one client: `(plate, held)` after ai-core's layer gave or took that player's key. */
export const VEHICLE_KEY_HELD_EVENT = "ai-core:client:vehicleKeyHeld";

/** ai-core's client vehicle key export. */
export type VehicleKeysClientExports = {
  /**
   * Whether the local player holds the keys of a vehicle (entity handle or plate), from a short-lived mirror of the
   * server's answers: the first call for a vehicle the player has not entered answers false and asks the server.
   */
  HasVehicleKeys(vehicle: number | string): boolean;
};
