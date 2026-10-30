import { CORE, type KeyHintRequest } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/**
 * Key hints a script shows for a while (admin noclip keys, a minigame's controls) next to the ones keybinds declare
 * with `hint`; HUDs list them on the left. `keybind` shows that keybind's current key, `key` a literal text.
 */
export const keyHints = {
  show: (id: string, hint: KeyHintRequest): void => core.ShowKeyHint(id, hint),
  hide: (id: string): void => core.HideKeyHint(id),
};
