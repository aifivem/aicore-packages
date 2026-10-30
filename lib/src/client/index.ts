/** Client-only helpers. Import from "@aicore-fivem/lib/client". */

/** A per-frame job that can be switched on and off without leaking ticks (an idle tick still costs time). */
export class TickLoop {
  private id: number | null = null;

  constructor(private readonly onFrame: () => void) {}

  get running(): boolean {
    return this.id !== null;
  }

  set(active: boolean): void {
    if (active && this.id === null) this.id = setTick(this.onFrame);
    else if (!active && this.id !== null) {
      clearTick(this.id);
      this.id = null;
    }
  }
}

export { onServerCallback, triggerServerCallback } from "./callback";
export { fromServer, onServerEvent } from "./netEvent";
export { AdminWorld } from "./adminWorld";
export { Zones, type ZoneOptions, type ZoneShape } from "./zones";
export { cache, onCache, readPlayerState, readWeapon } from "./cache";
export { hidePrompt, onPromptPressed, showPrompt } from "./prompt";
export { Points, type PointOptions } from "./point";
export type { ModelPointOptions } from "./modelPoint";
export { LocalPed, type LocalPedOptions } from "./localPed";
export { Blips, createBlip, type BlipOptions, type BlipStyle } from "./blip";
export {
  fadeOut,
  player,
  type AnimOptions,
  type TeleportOptions,
} from "./player";
export { notify, progress, type ProgressOptions } from "./notify";
export { input, menu } from "./menu";
export { inventory } from "./inventory";
export { getVehicleProps, setVehicleProps } from "./vehicleProps";
export { getPlayerData, onPlayerData, seedPlayerData } from "./playerData";
export { Keybind, type KeybindOptions } from "./keybind";
export { requestAnimDict, requestModel, requestPtfxAsset } from "./streaming";
export {
  callExport,
  isResourceStarted,
  optionalExport,
  provideExport,
  registerExport,
  resourceExport,
} from "../fivem/exports";
export { createLocale, loadLocaleTexts, LOCALE_CONVAR } from "../fivem/locale";
export { EntityState, GlobalGroup, GlobalKey, PlayerState, stateBoolean, stateNumber, stateString, type StateParse } from "../fivem/state";
