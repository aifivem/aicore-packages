import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Hands up, pointing and emotes of whatever emote script runs, through ai-core (tgiann-emotes, rpemotes). */
export const gestures = {
  isHandsUp: (): boolean => core.IsHandsUp(),
  isPointing: (): boolean => core.IsPointing(),
  /** The emote script answering (its resource name), or null when none runs. */
  provider: (): string | null => core.GetGestureProvider(),
  /** Plays an emote by its command name (`e <name>`) in the running emote script; false without one. */
  playEmote: (name: string): boolean => core.PlayEmote(name),
  /** Stops the emote the player plays (cuffed, knocked down); false without an emote script. */
  cancelEmote: (): boolean => core.CancelEmote(),
  /** The emote script that plays emotes, or null when none runs. */
  emoteProvider: (): string | null => core.GetEmoteProvider(),
};
