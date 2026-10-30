import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/**
 * ai-core's prompt (the "press E" box on the right): this resource shows and hides its own prompts by id; the
 * interaction key is one rebindable keybind in ai-core, so nothing polls keys per frame. Show a prompt on a zone's
 * enter, hide it on exit, act in `onPromptPressed`.
 */
export function showPrompt(id: string, text: string): void {
  core.ShowPrompt(id, text);
}

export function hidePrompt(id: string): void {
  core.HidePrompt(id);
}

/** The player pressed the interaction key while this resource's prompt `id` was the one on top. */
export function onPromptPressed(handler: (id: string) => void): void {
  const resource = GetCurrentResourceName();
  on(CORE.clientPromptPressedEvent, (owner: unknown, id: unknown) => {
    if (owner === resource && typeof id === "string") handler(id);
  });
}
