import type { InputRequest, MenuRequest } from "./menu";
import type { MinigameRequest } from "./minigame";
import type { Notification } from "./player";

/**
 * ai-lib's shared player UI (notifications, the progress bar, prompts, menus, inputs, minigames): one page in the
 * ai-lib resource that every resource draws through lib `notify` / `progress` / `showPrompt` / `menu` / `input` /
 * `skillCheck` / `lockpick` (and the Lua `aiLib` ones). It runs without ai-core.
 */
export const LIB_UI = {
  resource: "ai-lib",
  /** Server -> client: (notification: Notification) a notification card on the player's screen. */
  notifyEvent: "ai-lib:client:notify",
  /** Client local: (resource: string, id: string) the interaction key was pressed while that resource's prompt was on top. */
  promptPressedEvent: "ai-lib:client:promptPressed",
  /** Client local: the player pressed the cancel key while a progress bar shows (lib `progress` with `canCancel`). */
  cancelProgressEvent: "ai-lib:client:cancelProgress",
  /** Server -> client callback: (ServerProgress) runs the progress bar for a server flow (lib `progressFor`), answers true when it ran out. */
  progressForCallback: "ai-lib:progressFor",
  /** Server -> client: the server flow's progress bar stops (a newer `progressFor` replaced it). */
  progressForCancelEvent: "ai-lib:client:progressForCancel",
  /** Server -> client callback: (MinigameRequest) plays a minigame for a server flow (lib `minigameFor`), answers its result. */
  minigameForCallback: "ai-lib:minigameFor",
  /** Client local: (owner: string, key: string, inside: boolean) the player entered or left a zone ai-lib checks for `owner` (lib `Zones`). */
  zoneEvent: "ai-lib:client:zone",
} as const;

/**
 * NUI stacking (`SetNuiZindex`, higher on top): every resource with a page sets its layer at start, so the order
 * does not depend on load order. Notifications and menus (ai-lib) are over everything, police alerts over the HUD.
 */
export const NUI_LAYER = {
  hud: 10,
  screen: 20,
  death: 25,
  radial: 30,
  target: 35,
  chat: 40,
  alert: 50,
  lib: 100,
} as const;

/**
 * Where a world prompt floats: a fixed point, or spots on entities (offsets in the entity's own space, so the prompt
 * moves and turns with it: a swinging door). Of several entity spots the one nearest the player is shown each frame.
 */
export type PromptAnchor =
  | { x: number; y: number; z: number }
  | {
      anchors: Array<{
        entity: number;
        offset: { x: number; y: number; z: number };
      }>;
    };

/** ai-lib's client exports (the UI host); lib `notify`, `progress`, prompts, `menu`, `input` and minigames call them. */
export type AiLibClientExports = {
  Notify(notification: Notification): void;
  /** Shows the progress bar for `duration` ms (the calling resource runs the action and its animation). */
  ShowProgress(label: string, duration: number): void;
  HideProgress(): void;
  /** Shows (or updates) the calling resource's prompt `id` on the right of the screen. */
  /** `at`: drawn over that world point or entity spot (doors) instead of the right-hand list. */
  ShowPrompt(id: string, text: string, at?: PromptAnchor): void;
  HidePrompt(id: string): void;
  /** Checks a zone of the calling resource (lib `Zones` hands its zones over); enter / exit arrive as `LIB_UI.zoneEvent`. */
  AddZone(key: string, shape: unknown, interval: number, inside: boolean): void;
  RemoveZone(key: string): void;
  /** Shows a menu for the calling resource; the pick arrives as `MENU_EVENTS.menuResult`. */
  OpenMenu(requestId: number, request: MenuRequest): void;
  /** Shows an input dialog for the calling resource; the values arrive as `MENU_EVENTS.inputResult`. */
  OpenInput(requestId: number, request: InputRequest): void;
  /** Starts a minigame (skill check, lockpick); its result arrives as `MENU_EVENTS.menuResult`. */
  OpenMinigame(requestId: number, request: MinigameRequest): void;
  /** Closes the calling resource's open menu or input dialog (answered with null like a player close). */
  CloseDialog(): void;
};
