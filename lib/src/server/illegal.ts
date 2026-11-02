import {
  CORE,
  type CharacterResult,
  type CharacterTarget,
} from "@aifivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/**
 * A character's legal / illegal status through ai-core (metadata `illegal`), for scripts that gate illegal content.
 * Always legal while ai-core's panel switch `illegal.enabled` is off.
 */
export const illegal = {
  /** Whether a loaded player's character is illegal (a memory read; false when not loaded). */
  is: (source: number): boolean => core.IsIllegal(source) === true,
  /** Any character by citizenid or `{ charId }`, loaded or not; null when unknown. */
  of: (target: CharacterTarget): Promise<boolean | null> =>
    new Promise((resolve) => {
      const now = core.IsIllegal(target, resolve);
      if (now !== null) resolve(now);
    }),
  /** Marks a character illegal or legal, loaded or not (`{ ok }` or an ai-core lang key). */
  set: (target: CharacterTarget, state: boolean): Promise<CharacterResult> =>
    new Promise((resolve) => core.SetIllegal(target, state, resolve)),
};
