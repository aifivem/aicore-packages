import type { AdminDelta } from "./admin";
import type { CommandInfo, KeyHintRequest, KeyHintView } from "./commands";
import type { LogChannel, LogOptions } from "./logs";
import type {
  AiPlayerData,
  Branding,
  CharacterInfo,
  GangMembership,
  JobMembership,
  Notification,
} from "./player";
import type { AiVehiclesServerExports } from "./vehicles";
import type { InputRequest, ItemPickerRequest, MenuRequest } from "./menu";
import type { MinigameRequest } from "./minigame";
import type {
  InventoryClientExports,
  InventoryServerExports,
} from "./inventory";
import type { VehicleKeysServerExports } from "./vehicleKeys";
import type { PhoneServerExports } from "./phone";
import type { DispatchAlert, DispatchServerExports } from "./dispatch";
import type { RadialClientExports, RadialItem } from "./radial";
import type { CharacterAppearance } from "./appearance";

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

/** A money account for `TransferMoney`: a loaded player's, or a job's / gang's shared account. */
export type MoneyRef =
  | { source: number; account: string }
  | { owner: "job" | "gang"; id: string; account: string };

/** One death / ambulance script behind ai-core's medical layer (`resource/server/medical/`). */
export interface MedicalAdapter {
  resource: string;
  version?: string;
  /** False when the player was not down. */
  revive(source: number): boolean;
  heal(source: number): void;
  isDead(source: number): boolean;
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
  AddMoney(
    src: number,
    account: string,
    amount: number,
    reason?: string,
  ): boolean;
  RemoveMoney(
    src: number,
    account: string,
    amount: number,
    reason?: string,
  ): boolean;
  SetMoney(
    src: number,
    account: string,
    amount: number,
    reason?: string,
  ): boolean;

  GetJobs(src: number): JobMembership[] | null;
  GetCurrentJob(src: number): JobMembership | null;
  GetDutyJob(src: number): string | null;
  SetDuty(src: number, job: string | null): boolean;
  SetJob(src: number, job: string, grade: number): boolean;
  RemoveJob(src: number, job: string): boolean;
  GetOnDutyCount(job: string): number;
  /** Whether it is prime time for `job` (the default hours without one): tgiann-policealert's hours while it runs, else ai-core's panel hours. */
  IsPrimeTime(job?: string): boolean;

  GetGangs(src: number): GangMembership[] | null;
  GetActiveGang(src: number): string | null;
  SetGang(src: number, gang: string, grade: number): boolean;
  RemoveGang(src: number, gang: string): boolean;
  SetActiveGang(src: number, gang: string | null): boolean;

  GetMeta(src: number, key: string): unknown;
  SetMeta(src: number, key: string, value: unknown): boolean;

  /** The server's brand (name, subtitle, taglines, background) from the panel's General settings. */
  GetBranding(): Branding;
  /** Every job definition (a copy of the whole map: for rare reads; one job is `GetJobDefinition`). */
  GetJobDefinitions(): Record<string, JobDefinition>;
  GetGangDefinitions(): Record<string, GangDefinition>;
  GetJobDefinition(job: string): JobDefinition | null;
  /** Prison layer (lib `prison`): the first running prison script answers. */
  JailPlayer(source: number, minutes: number, by?: number): boolean;
  ReleasePlayer(source: number): boolean;
  GetJailTime(source: number): number;
  GetGangDefinition(gang: string): GangDefinition | null;
  GetAccountTypes(): Record<string, AccountTypeDefinition>;

  /** Sends a log of the calling resource to every provider turned on (Discord, Fivemanage, FiveM Stats, console). */
  Log(channel: string, message: string, options?: LogOptions): void;
  /** Describes the calling resource's log channels (datasets, on/off); call once at start. */
  LogChannels(channels: Record<string, LogChannel>): void;

  /** A resource with an admin panel announces itself (the lib's AdminPanel does it at start). */
  RegisterAdminPanel(resource: string): void;
  /** A panel resource changed a record: ai-core forwards it to the admins with the panel open. */
  AdminPanelChanged(delta: AdminDelta): void;
  /** The lib's `addCommand` announces a resource's commands for the panel's Commands tab (dropped when it stops). */
  RegisterCommands(resource: string, commands: CommandInfo[]): void;

  /** Values of a lookup list (items of the active inventory, jobs, gangs, accounts) for the admin panel's validation. */
  GetLookupValues(source: import("./admin").LookupSource): string[];
  /** Lists another script's own settings screen on the dashboard (opened by `command` or embedded `url`). */
  RegisterExternalPanel(panel: {
    id?: string;
    label: string;
    icon?: string;
    description?: string;
    command?: string;
    url?: string;
  }): void;
  /** Adds a check every connecting player passes: return a refusal text, or null to let the player through. */
  AddConnectionCheck(
    id: string,
    check: (
      source: number,
      identifiers: Record<string, string>,
    ) => string | null | undefined,
  ): void;
  /** Declares that `keep` (default: the calling resource) makes the `remove` resources unneeded (console warning, refused joins while both run). */
  RegisterReplacement(remove: string | string[], keep?: string): void;
  /** Scripts installed next to the one that replaces them; `running` = both started. */
  GetConflicts(): {
    keep: string;
    remove: string;
    running: boolean;
    from: string;
  }[];
  /** The players in a player's OneSync scope (~424 m), kept from ai-core's one set of scope handlers (lib `playersNear`). */
  GetPlayersInScope(source: number): number[];
  /** Scripts with a newer GitHub release than the running version (ai-core's update check). */
  GetUpdates(): import("./admin").UpdateInfo[];
  /** Time and weather of whatever weather script runs (the qb-weathersync contract); null / false while none runs. */
  GetWeather(): string | null;
  SetWeather(type: string): boolean;
  GetTime(): { hour: number; minute: number } | null;
  SetTime(hour: number, minute?: number): boolean;
  SetBlackout(on: boolean): boolean;
  FreezeTime(on: boolean): boolean;

  GetSharedMoney(
    ownerType: "job" | "gang",
    ownerId: string,
    account: string,
  ): number | null;
  AddSharedMoney(
    ownerType: "job" | "gang",
    ownerId: string,
    account: string,
    amount: number,
    reason?: string,
  ): boolean;
  RemoveSharedMoney(
    ownerType: "job" | "gang",
    ownerId: string,
    account: string,
    amount: number,
    reason?: string,
  ): boolean;
  /**
   * Moves `amount` between two accounts in one DB transaction with both ledger rows; `from` also pays `fee`.
   * False when an account is missing, both are the same or `from` cannot pay.
   */
  TransferMoney(
    from: MoneyRef,
    to: MoneyRef,
    amount: number,
    reason?: string,
    fee?: number,
  ): boolean;

  /** A free routing bucket for the calling resource (no population, strict lockdown); freed when it stops. */
  AcquireBucket(tag: string): number;
  /** Gives a bucket back (only the resource that took it can); move its players out first. */
  ReleaseBucket(id: number): boolean;

  /** The death / ambulance script ai-core's medical layer forwards to, or null. */
  GetMedicalSystem(): string | null;
  /** Gets a downed player up where they lie; false when not down or no death script runs. */
  RevivePlayer(source: number): boolean;
  /** Full health for a player who is not down; false when no death script runs. */
  HealPlayer(source: number): boolean;
  IsPlayerDead(source: number): boolean;

  /**
   * Moves a stored (not loaded) character's spawn point once no load or unload save holds it; false when the
   * character is loaded or the arguments are wrong (true = accepted, the write follows).
   */
  SetOfflinePosition(
    charId: number,
    position: { x: number; y: number; z: number; heading?: number },
  ): boolean;

  /** The clothing script ai-core's appearance layer reads looks from (ai-appearance, tgiann-clothing), or null. */
  GetAppearanceSystem(): string | null;
  /**
   * Reads a character's stored look (loaded or not) from the active clothing script; `done` gets it, or null when the
   * character has none or no clothing script runs. A callback, not a promise: no promise crosses a resource boundary.
   */
  GetCharacterAppearance(
    charId: number,
    done: (look: CharacterAppearance | null) => void,
  ): void;
} & InventoryServerExports &
  VehicleKeysServerExports &
  PhoneServerExports &
  DispatchServerExports;

/** ai-core's client exports. */
export type AiCoreClientExports = {
  GetPlayerData(): AiPlayerData | null;
  IsPlayerLoaded(): boolean;
  /** Shows (or updates) the calling resource's prompt `id` on the right of the screen. */
  ShowPrompt(id: string, text: string): void;
  HidePrompt(id: string): void;
  /** Hides every HUD while any reason holds (the calling resource's reasons go when it stops). */
  HideHud(reason: string): void;
  ShowHud(reason: string): void;
  IsHudVisible(): boolean;
  /** Opens the running HUD's own settings (ai-hud's /hud, tgiann-lumihud's /hud); false without one. */
  OpenHudSettings(): boolean;
  HasHudSettings(): boolean;
  /** Opens the keys screen: a keyboard with every key that has an action, and what each does. */
  OpenKeyboard(): void;
  /** Pauses the weather and time sync while any reason holds (interiors, scenes). */
  PauseWorldSync(reason: string): void;
  ResumeWorldSync(reason: string): void;
  /** Whether the weather and time sync is paused now (for a weather script that starts later). */
  IsWorldSyncPaused(): boolean;
  /** Job or gang definitions as the panel file holds them (bridges; follow `CORE.clientDefinitionsEvent`). */
  GetDefinitions(file: "jobs" | "gangs"): Record<string, unknown> | null;
  Notify(notification: Notification): void;
  /** Shows the progress bar for `duration` ms (the calling resource runs the action and its animation). */
  ShowProgress(label: string, duration: number): void;
  HideProgress(): void;
  /** Shows a menu for the calling resource; the pick arrives as `MENU_EVENTS.menuResult`. */
  OpenMenu(requestId: number, request: MenuRequest): void;
  /** Shows an input dialog for the calling resource; the values arrive as `MENU_EVENTS.inputResult`. */
  OpenInput(requestId: number, request: InputRequest): void;
  /** Opens the item picker; the list (`PickedItem[]`) or null arrives as `MENU_EVENTS.menuResult`. */
  OpenItemPicker(requestId: number, request: ItemPickerRequest): void;
  /** Starts a minigame (skill check, lockpick); its result arrives as `MENU_EVENTS.menuResult`. */
  OpenMinigame(requestId: number, request: MinigameRequest): void;
  /** The key a lib `Keybind` was registered with (mapping command `+<name>_<key>`); null until it is registered. */
  GetKeybindKey(name: string): string | null;
  /** Shows a key hint of the calling resource until `HideKeyHint` (dropped when that resource stops). */
  ShowKeyHint(id: string, hint: KeyHintRequest): void;
  HideKeyHint(id: string): void;
  /** The key hints HUDs show now (also sent as `KEY_HINTS.changedEvent`). */
  GetKeyHints(): KeyHintView[];
  /** The emote script answering hands up / pointing (tgiann-emotes, ai-smallresources), or null. */
  GetGestureProvider(): string | null;
  /** The local player has the hands up / points, in whichever emote script runs. */
  IsHandsUp(): boolean;
  IsPointing(): boolean;
  /**
   * Puts a look from `GetCharacterAppearance` on a ped through the active clothing script; false when the ped is gone,
   * its model differs from the look's or no clothing script runs. On the player's own ped it changes what they wear
   * (whether that is saved is the clothing script's rule).
   */
  ApplyAppearance(ped: number, look: CharacterAppearance): boolean;
  /** The look a ped wears now (same shape as `GetCharacterAppearance`), null when the clothing script cannot tell. */
  GetPedAppearance(ped: number): CharacterAppearance | null;
} & InventoryClientExports &
  RadialClientExports;

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

/** ai-inventory's own server exports (ai-core's inventory adapter uses them; ox / qb names are answered too). */
export type AiInventoryServerExports = {
  AddItem(
    inv: number | string,
    item: string,
    count: number,
    metadata?: Record<string, unknown>,
    slot?: number,
  ): boolean;
  RemoveItem(
    inv: number | string,
    item: string,
    count: number,
    metadata?: Record<string, unknown>,
    slot?: number,
  ): boolean;
  GetItemCount(
    inv: number | string,
    item: string,
    metadata?: Record<string, unknown>,
  ): number;
  /** Every stack of an inventory with its item label. */
  GetItems(inv: number | string): Array<{
    name: string;
    label: string;
    count: number;
    slot: number;
    metadata: Record<string, unknown>;
  }>;
  CanCarryItem(
    inv: number | string,
    item: string,
    count: number,
    metadata?: Record<string, unknown>,
  ): boolean;
  /** `handler` returning false keeps the item (otherwise the item's "consume" amount is taken). */
  RegisterUsableItem(
    name: string,
    handler: (
      source: number,
      item: {
        name: string;
        slot: number;
        count: number;
        metadata: Record<string, unknown>;
      },
    ) => unknown,
  ): void;
  RegisterStash(
    name: string,
    label: string,
    slots: number,
    maxWeight: number,
    jobs?: string[],
    personal?: boolean,
  ): void;
  OpenInventory(source: number, inv: number | string): boolean;
  ClearInventory(inv: number | string): void;
  /** One item definition (ox shape), or every one by name when `name` is left out. */
  Items(name?: string): unknown;
  /** An inventory's carried weight and limit (grams), null when it is not loaded. */
  GetWeight(inv: number | string): { weight: number; maxWeight: number } | null;
};

/** ai-inventory's own client exports (ai-core's inventory adapter uses them). */
export type AiInventoryClientExports = {
  /** Opens the player's own inventory screen (with the ground / trunk / glovebox around). */
  OpenSelf(): void;
  HasItem(
    items: string | string[] | Record<string, number>,
    amount?: number,
  ): boolean;
};

/** ai-appearance's client exports (ai-core's appearance adapter uses them; scripts use lib `appearance`). */
export type AiAppearanceClientExports = {
  /** Puts an ai-appearance look (its `Appearance` JSON) on a ped of the look's model; false when the look is invalid or the model differs. */
  ApplyAppearance(ped: number, appearance: unknown): boolean;
  /** The look the local player wears (its `Appearance`), null for any other ped. */
  GetPedAppearance(ped: number): unknown;
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

/** Both sides share the resource key; a caller uses the half of its own side. */
export type AiCoreExports = AiCoreServerExports & AiCoreClientExports;

declare global {
  interface CitizenExports {
    "ai-core": AiCoreExports;
    "ai-target": AiTargetClientExports;
    "ai-appearance": AiAppearanceClientExports;
    "ai-vehicles": AiVehiclesServerExports;
    "ai-vehiclekeys": AiVehicleKeysServerExports;
    "ai-death": AiDeathServerExports;
    "ai-radialmenu": AiRadialClientExports;
    "ai-policealert": AiPoliceAlertServerExports;
    "ai-doorlock": AiDoorlockServerExports;
    "ai-inventory": AiInventoryServerExports & AiInventoryClientExports;
    "ai-smallresources": AiSmallResourcesClientExports;
    "ai-hud": AiHudClientExports;
  }
}
