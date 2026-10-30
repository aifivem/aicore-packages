import { CORE, type NotificationKind } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";
import { cache } from "./cache";
import { requestAnimDict } from "./streaming";

const core = resourceExport(CORE.resource);

/** Shows a notification card on this player's screen (ai-core draws it); `text` is already translated. */
export function notify(text: string, kind: NotificationKind = "info", duration?: number): void {
  core.Notify({ text, kind, duration });
}

export interface ProgressOptions {
  label: string;
  /** Milliseconds. */
  duration: number;
  anim?: { dict: string; clip: string; flag?: number };
  /** Getting into a vehicle cancels it unless true. */
  allowVehicle?: boolean;
}

/**
 * Runs a timed action with ai-core's progress bar and an optional animation; resolves true when it ran out, false
 * when cancelled (death, getting into a vehicle). Checks ten times a second, nothing per frame.
 */
export async function progress(options: ProgressOptions): Promise<boolean> {
  const ped = cache.ped;
  if (options.anim) {
    await requestAnimDict(options.anim.dict);
    TaskPlayAnim(ped, options.anim.dict, options.anim.clip, 3, 3, options.duration, options.anim.flag ?? 49, 0, false, false, false);
  }
  core.ShowProgress(options.label, options.duration);
  const end = GetGameTimer() + options.duration;
  const done = await new Promise<boolean>((resolve) => {
    const timer = setInterval(() => {
      const cancelled = IsEntityDead(cache.ped) || (!options.allowVehicle && cache.vehicle !== false);
      if (!cancelled && GetGameTimer() < end) return;
      clearInterval(timer);
      resolve(!cancelled);
    }, 100);
  });
  if (options.anim) StopAnimTask(ped, options.anim.dict, options.anim.clip, 1);
  core.HideProgress();
  return done;
}
