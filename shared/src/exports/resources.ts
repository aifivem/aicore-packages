import type { JobOutfit } from "../appearance";
import type { DispatchAlert } from "../dispatch";
import type { RadialItem } from "../radial";

/** ai-target's client exports that ai-core uses. */
export type AiTargetClientExports = {
  /** The interaction key was pressed: runs the focused target option; false when no target is in focus. */
  HandleInteract(): boolean;
  /** ox_target shape: options on every entity of these models; `onSelect` runs in the calling resource. */
  addModel(
    models: Array<string | number>,
    options: Array<{
      name: string;
      label: string;
      icon?: string;
      distance?: number;
      onSelect?: (data: unknown) => void;
    }>,
  ): void;
  removeModel(models: Array<string | number>, names?: string[]): void;
};

/** ai-appearance's client exports (ai-core's appearance adapter uses them; scripts use lib `appearance`). */
export type AiAppearanceClientExports = {
  /** Puts an ai-appearance look (its `Appearance` JSON) on a ped of the look's model; false when the look is invalid or the model differs. */
  ApplyAppearance(ped: number, appearance: unknown): boolean;
  /** The look the local player wears (its `Appearance`), null for any other ped. */
  GetPedAppearance(ped: number): unknown;
  /** Puts a job outfit on the local player until `ReloadSkin` (never saved). */
  WearOutfit(outfit: JobOutfit): void;
  /** Puts the saved look back on the local player. */
  ReloadSkin(): void;
};

/**
 * ai-radialmenu's own client exports (ai-core's radial layer calls them; scripts use lib `radial`). Items are removed
 * when the adding resource stops; `onSelect` is the older name of `onPressed`.
 */
export type AiRadialClientExports = {
  AddItem(item: RadialItem & { onSelect?: () => void }): void;
  RemoveItem(id: string, parent?: string): void;
  /** Reads every `canShow` of an open wheel again. */
  Refresh(): void;
};

/** ai-vehiclekeys' server exports: a vehicle is an entity or a plate. */
export type AiVehicleKeysServerExports = {
  HasKeys(source: number, vehicle: number | string): boolean;
  GiveKeys(source: number, vehicle: number | string): void;
  RemoveKeys(source: number, vehicle: number | string): void;
};

/** ai-death's server exports. */
export type AiDeathServerExports = {
  /** Gets a downed player up where they lie; false when they are not down. */
  Revive(source: number): boolean;
  IsDead(source: number): boolean;
  /** Full health for a player who is not down. */
  Heal(source: number): void;
};

/** ai-policealert's server exports. */
export type AiPoliceAlertServerExports = {
  /** ai-core's dispatch layer hands an alert to the built-in alert cards (scripts call lib `dispatch`). */
  DispatchAlert(alert: DispatchAlert): void;
};

/** ai-doorlock's server exports (doors by panel id). */
export type AiDoorlockServerExports = {
  SetDoorState(id: string, locked: boolean): void;
  IsLocked(id: string): boolean;
};

/** ai-smallresources' client exports; the seat belt changes arrive as the local event `SEATBELT_EVENT`. */
export type AiSmallResourcesClientExports = {
  /** Whether the local player wears a seat belt; null while seat belts are off or not in a vehicle with one. */
  GetSeatbelt(): boolean | null;
};

/** ai-hud's client exports (ai-core opens its settings; ai-admin's minimap toggle). */
export type AiHudClientExports = {
  OpenSettings(): void;
  SetMinimapAlways(on: boolean): void;
  GetMinimapAlways(): boolean;
};

/** ai-hud's server exports (ai-core's stress layer adds stress through `AddNeed`). */
export type AiHudServerExports = {
  /** Adds `delta` to a loaded player's need (0-100, clamped). */
  AddNeed(
    source: number,
    need: "hunger" | "thirst" | "stress",
    delta: number,
  ): void;
  /** Sets a loaded player's need to `value` (0-100, clamped). */
  SetNeed(
    source: number,
    need: "hunger" | "thirst" | "stress",
    value: number,
  ): void;
};

/** ai-vehicleshop's server exports. */
export type AiVehicleshopServerExports = {
  /** A model's catalog price, null when the catalog has no such model. */
  GetCatalogPrice(model: string): number | null;
};
