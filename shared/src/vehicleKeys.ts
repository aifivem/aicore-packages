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
