import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Hands up and pointing of whatever emote script runs, through ai-core (tgiann-emotes, ai-smallresources). */
export const gestures = {
  isHandsUp: (): boolean => core.IsHandsUp(),
  isPointing: (): boolean => core.IsPointing(),
  /** The emote script answering (its resource name), or null when none runs. */
  provider: (): string | null => core.GetGestureProvider(),
};
