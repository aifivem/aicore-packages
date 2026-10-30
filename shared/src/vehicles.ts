import type { KeyPurpose } from "./vehicleKeys";
/** Owned vehicle contract (ai-vehicles keeps them; garages, shops, keys and fuel use them). */

export type VehicleOwnerType = "character" | "job" | "gang";
export type VehicleState = "garage" | "out" | "impound";

export interface VehicleOwner {
  type: VehicleOwnerType;
  /** Character id (as text), job or gang name. */
  id: string;
}

export interface OwnedVehicle {
  id: number;
  plate: string;
  owner: VehicleOwner;
  model: string;
  /** VehicleProps (`@aicore-fivem/lib/shared`) or null before the first save. */
  props: unknown;
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
  GetEntity(id: number): number | null;
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
  StoreVehicle(id: number, garage: string | null, state?: VehicleState): void;
  SetOwner(id: number, owner: VehicleOwner): void;
  DeleteVehicle(id: number): void;
  /** Creates the entity; `cb` gets its net id (null when it failed). `asker` is a player whose client answers the model type. */
  SpawnVehicle(
    id: number,
    at: { x: number; y: number; z: number; heading: number },
    asker: number,
    cb: (netId: number | null) => void,
    purpose?: KeyPurpose,
  ): void;
};
