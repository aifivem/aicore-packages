import { LIB_UI } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const ui = resourceExport(LIB_UI.resource);

/**
 * ai-lib's prompt (the "press E" box on the right): this resource shows and hides its own prompts by id; the
 * interaction key is one rebindable keybind in ai-lib, so nothing polls keys per frame. Show a prompt on a zone's
 * enter, hide it on exit, act in `onPromptPressed`. With `at` the prompt floats over that world point instead
 * (a door), the same key acting on it.
 */
export function showPrompt(
  id: string,
  text: string,
  at?: { x: number; y: number; z: number },
): void {
  ui.ShowPrompt(id, text, at);
}

export function hidePrompt(id: string): void {
  ui.HidePrompt(id);
}

/** The player pressed the interaction key while this resource's prompt `id` was the one on top. */
export function onPromptPressed(handler: (id: string) => void): void {
  const resource = GetCurrentResourceName();
  on(LIB_UI.promptPressedEvent, (owner: unknown, id: unknown) => {
    if (owner === resource && typeof id === "string") handler(id);
  });
}
