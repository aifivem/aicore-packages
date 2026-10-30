import { CORE } from "@aicore-fivem/shared";
import { callExport, isResourceStarted } from "../fivem/exports";
import { GlobalKey, stateString } from "../fivem/state";
import { createLogger } from "../shared";

/** What `Points` and model points share: the interaction style, the target API, one action at a time. */

export type Style = "prompt" | "target";
export const TARGET = "ox_target";
export const log = createLogger(GetCurrentResourceName());

/** The ox_target API (ai-target answers it under that name). */
export const target = (name: string, ...args: unknown[]) =>
  callExport(TARGET, name, ...args);

const interaction = new GlobalKey(CORE.interactionStateKey, stateString);
/** Prompt mode, or target mode when the owner picked it and a resource answers the ox_target API. */
export const style = (): Style =>
  interaction.get() === "target" && isResourceStarted(TARGET)
    ? "target"
    : "prompt";
export const onStyleChange = (fn: () => void) => interaction.onChange(fn);

let busy = false;

/** Runs a point's action unless another one of this resource still runs; a returned promise blocks until it settles. */
export function runPress(allowed: () => boolean, action: () => unknown): void {
  if (busy || !allowed()) return;
  let result: unknown;
  try {
    result = action();
  } catch (error) {
    return log.error("point onPressed failed", error);
  }
  if (!(result instanceof Promise)) return;
  busy = true;
  result
    .catch((error: unknown) => log.error("point onPressed failed", error))
    .finally(() => (busy = false));
}

/** A label or a label function, read safely. */
export function readLabel(label: string | (() => string)): string {
  if (typeof label === "string") return label;
  try {
    return label();
  } catch (error) {
    log.error("point label failed", error);
    return "";
  }
}

/** A `canShow`, read safely (absent = allowed). */
export function readAllowed(canShow: (() => boolean) | undefined): boolean {
  try {
    return canShow?.() ?? true;
  } catch (error) {
    log.error("point canShow failed", error);
    return false;
  }
}
