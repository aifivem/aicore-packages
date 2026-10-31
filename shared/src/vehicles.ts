import type { KeyPurpose } from "./vehicleKeys";
/** Owned vehicle contract (ai-vehicles keeps them; garages, shops, keys and fuel use them). */

/** `resource`: held by a script (a used car lot listing), no player has it. */
export type VehicleOwnerType = "character" | "job" | "gang" | "resource";
export type VehicleState = "garage" | "out" | "impound";

export interface VehicleOwner {
  type: VehicleOwnerType;
  /** Character id (as text), job or gang name, or the holding resource's name. */
  id: string;
}

export interface OwnedVehicle {
  id: number;
  plate: string;
  owner: VehicleOwner;
  model: string;
  /** VehicleProps (`@aicore-fivem/lib/shared`) or null before the first save. */
  props: unknown;
  /** VehicleSetup (lib `spawnVehicle`'s `setup`) the vehicle spawns with while it has no props (a shop's colour). */
  setup: unknown;
  state: VehicleState;
  garage: string | null;
  fuel: number;
  engine: number;
  body: number;
}

/** Entity state bags ai-vehicles sets on a spawned owned vehicle. */
export const VEHICLE_BAGS = {
  /** true: an owned vehicle. */
  owned: "ai:owned",
  /** Its id in ai-vehicles. */
  id: "ai:vid",
  /** VehicleProps; the entity's owner client applies them (ai-core). */
  props: "ai:props",
  /** VehicleSetup (lib `spawnVehicle`'s `setup`): the owner client applies it once (ai-core). */
  setup: "ai:setup",
  /** 0-100, kept by a fuel resource. */
  fuel: "fuel",
} as const;

/** ai-vehicles' server exports. */
export type AiVehiclesServerExports = {
  CreateVehicle(
    owner: VehicleOwner,
    model: string,
    garage: string | null,
    props?: unknown,
  ): { id: number; plate: string } | null;
  GetVehicle(ref: number | string): OwnedVehicle | null;
  /** Vehicles of an owner who is online (characters) or any job / gang fleet. */
  GetVehicles(owner: VehicleOwner): OwnedVehicle[];
  IsOwnedPlate(plate: string): boolean;
  GetVehicleIdByEntity(entity: number): number | null;
  /** Every owned vehicle in memory as `[plate, ownerType, ownerId]` (key systems mirror it, then follow `VEHICLES_EVENTS.owners`). */
  GetPlateOwners(): Array<[plate: string, type: VehicleOwnerType, id: string]>;
  GetEntity(id: number): number | null;
  /**
   * Saves condition and look: fuel, damage, state, garage and `props` (colours, extras, dirt, ...). The stored tuning
   * (`mods`, `neon`) stays: a client-read look never changes it (a mod menu cannot persist mods). Tuning: `SaveTuning`.
   */
  SaveVehicle(
    id: number,
    change: {
      props?: unknown;
      fuel?: number;
      engine?: number;
      body?: number;
      state?: VehicleState;
      garage?: string | null;
    },
  ): void;
  /** Saves full props including the tuning (`mods`, `neon`). Only a tuning shop (ai-mechanic) calls it. */
  SaveTuning(id: number, props: unknown): void;
  StoreVehicle(id: number, garage: string | null, state?: VehicleState): void;
  SetOwner(id: number, owner: VehicleOwner): void;
  DeleteVehicle(id: number): void;
  /**
   * Creates the entity; `cb` gets its net id (null when it failed). `asker` is a player whose client answers the model
   * type. `setup` (lib VehicleSetup, e.g. `{ colors }`) is kept with a vehicle that has no props yet and applied on every
   * spawn until its first props save, so a bought colour survives a vehicle that was never parked.
   */
  SpawnVehicle(
    id: number,
    at: { x: number; y: number; z: number; heading: number },
    asker: number,
    cb: (netId: number | null) => void,
    purpose?: KeyPurpose,
    setup?: unknown,
  ): void;
};

/** ai-vehicles' server local events. */
export const VEHICLES_EVENTS = {
  /** (puts: [plate, ownerType, ownerId][], removes: plate[]) owners of vehicles in memory changed (one batch per tick). */
  owners: "ai-vehicles:owners",
} as const;
