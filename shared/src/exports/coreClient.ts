import type {
  CharacterAppearance,
  ClothingMenu,
  JobOutfit,
} from "../appearance";
import type { KeyHintRequest, KeyHintView } from "../commands";
import type { InventoryClientExports } from "../inventory/exports";
import type { ItemPickerRequest } from "../menu";
import type { AiPlayerData, Notification } from "../player";
import type { RadialClientExports } from "../radial";
import type { VehicleKeysClientExports } from "../vehicleKeys";

/** ai-core's client exports. */
export type AiCoreClientExports = {
  GetPlayerData(): AiPlayerData | null;
  /** The local player is down in whatever death script runs (lib `medical.isDead`, kept by `CORE.clientDeadEvent`). */
  IsDead(): boolean;
  IsPlayerLoaded(): boolean;
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
  /** Opens the item picker; the list (`PickedItem[]`) or null arrives as `MENU_EVENTS.menuResult`. */
  OpenItemPicker(requestId: number, request: ItemPickerRequest): void;
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
  /** Opens the active clothing script's clothing shop, barber or saved outfits; false when it has no such menu. */
  OpenClothingMenu(menu: ClothingMenu): boolean;
  /** Puts a job outfit on the local player until `ReloadSkin` (not saved); false when the clothing script cannot. */
  WearOutfit(outfit: JobOutfit): boolean;
  /** Puts the local player's saved look back on (takes a job outfit off); false without a clothing script. */
  ReloadSkin(): boolean;
  /** The emote script that plays emotes by name (tgiann-emotes, rpemotes), or null. */
  GetEmoteProvider(): string | null;
  /** Plays an emote of the running emote script by its command name (`e <name>`); false without one. */
  PlayEmote(name: string): boolean;
  /** Stops the emote the local player plays; false without an emote script. */
  CancelEmote(): boolean;
  /** The seat belt script ai-core reads (ai-smallresources, a HUD's own belt), or null. */
  GetSeatbeltProvider(): string | null;
  /** Whether the local player wears a seat belt; null when no seat belt script answers or not in a car with one. */
  GetSeatbelt(): boolean | null;
  /** Shows an ai-lib card in the notification UI the panel picked; false when ai-lib draws it itself. */
  ExternalNotify(notification: Notification): boolean;
  /** Opens the active MDT for the local player (the MDT checks the job itself); false when none runs or it cannot be opened from outside. */
  OpenMdt(): boolean;
} & InventoryClientExports &
  VehicleKeysClientExports &
  RadialClientExports;
