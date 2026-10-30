import type { AdminDelta } from "./admin";
import type { LogChannel, LogOptions } from "./logs";
import type { AiPlayerData, CharacterInfo, GangMembership, JobMembership, Notification } from "./player";
import type { AiVehiclesServerExports } from "./vehicles";
import type { InputRequest, MenuRequest } from "./menu";

/** A grade of a job or gang definition (panel content). */
export interface GradeDefinition {
  label: string;
  salary: number;
  boss: boolean;
}

export interface JobDefinition {
  label: string;
  type: string;
  defaultDuty: boolean;
  grades: GradeDefinition[];
}

export interface GangDefinition {
  label: string;
  grades: GradeDefinition[];
}

export interface AccountTypeDefinition {
  label: string;
  start: number;
  allowNegative: boolean;
}

/**
 * ai-core's server exports: synchronous, small values. Callers mirror what they need and follow ai-core's local
 * events (`CORE.*Event`) instead of calling these in hot paths. A type alias, not an interface: it must fit
 * CitizenExports' index signature.
 */
export type AiCoreServerExports = {
  GetPlayerData(src: number): AiPlayerData | null;
  GetCharacter(src: number): CharacterInfo | null;
  GetSourceByCharId(charId: number): number | null;
  GetSourceByCitizenId(citizenid: string): number | null;
  GetLoadedSources(): number[];
  GetFivemId(src: number): string | null;
  SwitchCharacter(src: number): boolean;

  GetMoney(src: number, account: string): number | null;
  AddMoney(src: number, account: string, amount: number, reason?: string): boolean;
  RemoveMoney(src: number, account: string, amount: number, reason?: string): boolean;
  SetMoney(src: number, account: string, amount: number, reason?: string): boolean;

  GetJobs(src: number): JobMembership[] | null;
  GetCurrentJob(src: number): JobMembership | null;
  GetDutyJob(src: number): string | null;
  SetDuty(src: number, job: string | null): boolean;
  SetJob(src: number, job: string, grade: number): boolean;
  RemoveJob(src: number, job: string): boolean;
  GetOnDutyCount(job: string): number;

  GetGangs(src: number): GangMembership[] | null;
  GetActiveGang(src: number): string | null;
  SetGang(src: number, gang: string, grade: number): boolean;
  RemoveGang(src: number, gang: string): boolean;
  SetActiveGang(src: number, gang: string | null): boolean;

  GetMeta(src: number, key: string): unknown;
  SetMeta(src: number, key: string, value: unknown): boolean;

  GetJobDefinitions(): Record<string, JobDefinition>;
  GetGangDefinitions(): Record<string, GangDefinition>;
  GetAccountTypes(): Record<string, AccountTypeDefinition>;

  /** Sends a log of the calling resource to every provider turned on (Discord, Fivemanage, FiveM Stats, console). */
  Log(channel: string, message: string, options?: LogOptions): void;
  /** Describes the calling resource's log channels (datasets, on/off); call once at start. */
  LogChannels(channels: Record<string, LogChannel>): void;

  /** A resource with an admin panel announces itself (the lib's AdminPanel does it at start). */
  RegisterAdminPanel(resource: string): void;
  /** A panel resource changed a record: ai-core forwards it to the admins with the panel open. */
  AdminPanelChanged(delta: AdminDelta): void;

  GetSharedMoney(ownerType: "job" | "gang", ownerId: string, account: string): number | null;
  AddSharedMoney(ownerType: "job" | "gang", ownerId: string, account: string, amount: number, reason?: string): boolean;
  RemoveSharedMoney(ownerType: "job" | "gang", ownerId: string, account: string, amount: number, reason?: string): boolean;
};

/** ai-core's client exports. */
export type AiCoreClientExports = {
  GetPlayerData(): AiPlayerData | null;
  IsPlayerLoaded(): boolean;
  /** Shows (or updates) the calling resource's prompt `id` on the right of the screen. */
  ShowPrompt(id: string, text: string): void;
  HidePrompt(id: string): void;
  Notify(notification: Notification): void;
  /** Shows the progress bar for `duration` ms (the calling resource runs the action and its animation). */
  ShowProgress(label: string, duration: number): void;
  HideProgress(): void;
  /** Shows a menu for the calling resource; the pick arrives as `MENU_EVENTS.menuResult`. */
  OpenMenu(requestId: number, request: MenuRequest): void;
  /** Shows an input dialog for the calling resource; the values arrive as `MENU_EVENTS.inputResult`. */
  OpenInput(requestId: number, request: InputRequest): void;
};

/** ai-target's client exports that ai-core uses. */
export type AiTargetClientExports = {
  /** The interaction key was pressed: runs the focused target option; false when no target is in focus. */
  HandleInteract(): boolean;
  /** ox_target shape: options on every entity of these models; `onSelect` runs in the calling resource. */
  addModel(models: Array<string | number>, options: Array<{ name: string; label: string; icon?: string; distance?: number; onSelect?: (data: unknown) => void }>): void;
  removeModel(models: Array<string | number>, names?: string[]): void;
};

/** ai-inventory's server exports other ai-* resources use (ox / qb names are answered too, see its compat notes). */
export type AiInventoryServerExports = {
  AddItem(inv: number | string, item: string, count: number, metadata?: Record<string, unknown>, slot?: number): boolean;
  RemoveItem(inv: number | string, item: string, count: number, metadata?: Record<string, unknown>, slot?: number): boolean;
  GetItemCount(inv: number | string, item: string, metadata?: Record<string, unknown>): number;
  /** Every stack of an inventory with its item label. */
  GetItems(inv: number | string): Array<{ name: string; label: string; count: number; slot: number; metadata: Record<string, unknown> }>;
  CanCarryItem(inv: number | string, item: string, count: number, metadata?: Record<string, unknown>): boolean;
  /** `handler` returning false keeps the item (otherwise the item's "consume" amount is taken). */
  RegisterUsableItem(name: string, handler: (source: number, item: { name: string; slot: number; count: number; metadata: Record<string, unknown> }) => unknown): void;
  RegisterStash(name: string, label: string, slots: number, maxWeight: number, jobs?: string[], personal?: boolean): void;
  OpenInventory(source: number, inv: number | string): boolean;
  ClearInventory(inv: number | string): void;
};

/** ai-inventory's client exports other ai-* resources use. */
export type AiInventoryClientExports = {
  /** Opens the player's own inventory screen (with the ground / trunk / glovebox around). */
  OpenSelf(): void;
};

/** ai-radialmenu's client exports: items on the wheel (removed when the adding resource stops). */
export type AiRadialClientExports = {
  AddItem(item: { id: string; label: string; icon?: string; onSelect?: () => void }): void;
  RemoveItem(id: string): void;
};

/** ai-vehiclekeys' server exports: a vehicle is an entity or a plate. */
export type AiVehicleKeysServerExports = {
  HasKeys(source: number, vehicle: number | string): boolean;
  GiveKeys(source: number, vehicle: number | string): void;
  RemoveKeys(source: number, vehicle: number | string): void;
};

/** ai-police's server exports. */
export type AiPoliceServerExports = {
  /** A translated alert text at a place, to on-duty officers (blip + notification). */
  SendAlert(x: number, y: number, z: number, text: string): void;
};

/** ai-doorlock's server exports (doors by panel id). */
export type AiDoorlockServerExports = {
  SetDoorState(id: string, locked: boolean): void;
  IsLocked(id: string): boolean;
};

/** Both sides share the resource key; a caller uses the half of its own side. */
export type AiCoreExports = AiCoreServerExports & AiCoreClientExports;

declare global {
  interface CitizenExports {
    "ai-core": AiCoreExports;
    "ai-target": AiTargetClientExports;
    "ai-vehicles": AiVehiclesServerExports;
    "ai-vehiclekeys": AiVehicleKeysServerExports;
    "ai-radialmenu": AiRadialClientExports;
    "ai-police": AiPoliceServerExports;
    "ai-doorlock": AiDoorlockServerExports;
    "ai-inventory": AiInventoryServerExports & AiInventoryClientExports;
  }
}
