import { CORE } from "@aicore-fivem/shared";
import { isResourceStarted } from "../../fivem/exports";
import { GlobalKey } from "../../fivem/state/globalState";
import { stateString } from "../../fivem/state/mirror";
import { createLogger } from "../../shared";
import type { Target, TargetAdapter } from "./targets/adapter";
import { TARGETS } from "./targets/targets";

/** What `Points` and model points share: the interaction style, the target in use, one action at a time. */

export type Style = "prompt" | "target";
export const log = createLogger(GetCurrentResourceName());

const NAMES = new Set(TARGETS.map((t) => t.resource));
/**
 * Targets that read started but answered "No such export": while clients load, a resource reads started before its
 * scripts ran (and a provided name reads started without answering). They are skipped until a target starts.
 */
const notReady = new Set<string>();
const changeHandlers: Array<() => void> = [];
let changeQueued = false;
/** Tells `onTargetChange` listeners once, after the current call (the start / stop event or the failed call). */
function changed(): void {
  if (changeQueued) return;
  changeQueued = true;
  setTimeout(() => {
    changeQueued = false;
    for (const fn of changeHandlers) fn();
  }, 0);
}
for (const event of ["onClientResourceStart", "onClientResourceStop"])
  on(event, (resource: string) => {
    if (!NAMES.has(resource)) return;
    if (event === "onClientResourceStart") notReady.clear();
    changed();
  });

/** Runs `fn` when the target in use may have changed (a target started, stopped or turned out not ready). */
export const onTargetChange = (fn: () => void) => void changeHandlers.push(fn);

/** The target options go on: the first running one in `TARGETS` order that is ready, null when none. */
export function activeTarget(): Target | null {
  for (const target of TARGETS)
    if (!notReady.has(target.resource) && isResourceStarted(target.resource))
      return target;
  return null;
}
export const targetRunning = (): boolean => activeTarget() !== null;

/** One call on a target; null when it failed (no exports yet: the target is skipped until a target starts). */
function useTarget<T>(
  target: Target,
  call: (adapter: TargetAdapter) => T,
): { value: T } | null {
  try {
    return { value: call(target.adapter) };
  } catch (error) {
    if (String(error).includes("No such export")) {
      notReady.add(target.resource);
      changed();
    } else log.error(`${target.resource} target call failed`, error);
    return null;
  }
}

/** An option put on a target, with the call that takes it off again. */
export interface Registration {
  target: Target;
  remove(adapter: TargetAdapter): void;
}

/** Puts an option on a target; null when the target could not take it (the point stays a prompt meanwhile). */
export function register<T>(
  target: Target,
  add: (adapter: TargetAdapter) => T,
  remove: (adapter: TargetAdapter, value: T) => void,
): Registration | null {
  const added = useTarget(target, add);
  return added && { target, remove: (a) => remove(a, added.value) };
}

/** Takes an option off its target again (nothing to do when that target stopped: its options went with it). */
export function unregister(registration: Registration | null): void {
  if (registration && isResourceStarted(registration.target.resource))
    useTarget(registration.target, registration.remove);
}

const interaction = new GlobalKey(CORE.interactionStateKey, stateString);
/** Prompt mode, or target mode when the owner picked it and a target script runs. */
export const style = (): Style =>
  interaction.get() === "target" && targetRunning() ? "target" : "prompt";
export const onStyleChange = (fn: () => void) => interaction.onChange(fn);

/** The style one point uses: the owner's, unless the point asks for its own (`promptOnly`, `preferTarget`). */
export function pointStyle(
  options: { promptOnly?: boolean; preferTarget?: boolean },
  group: Style,
): Style {
  if (options.promptOnly) return "prompt";
  if (options.preferTarget && targetRunning()) return "target";
  return group;
}

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
export function readAllowed(
  canShow: ((entity: number) => boolean) | undefined,
  entity = 0,
): boolean {
  try {
    return canShow?.(entity) ?? true;
  } catch (error) {
    log.error("point canShow failed", error);
    return false;
  }
}
