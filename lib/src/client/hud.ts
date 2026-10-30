import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/**
 * HUDs (ai-hud, tgiann-lumihud...) through ai-core: a full-screen UI hides them on open and shows them on close.
 * Reasons are per resource and counted, so two screens open at once keep the HUD hidden until both close.
 */
export const hud = {
  hide: (reason: string): void => core.HideHud(reason),
  show: (reason: string): void => core.ShowHud(reason),
  /** Whether HUDs show now (no full-screen UI open). */
  get visible(): boolean {
    return core.IsHudVisible();
  },
  /** Runs `fn(visible)` when HUDs show or hide (for a HUD resource). */
  onChange(fn: (visible: boolean) => void): void {
    on(
      CORE.clientHudVisibleEvent,
      (visible: unknown) => typeof visible === "boolean" && fn(visible),
    );
  },
};
