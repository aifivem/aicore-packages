import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";
import { every } from "../fivem/scheduler";
import { cache } from "./cache";
import { controls } from "./controls";
import { sleep } from "../shared/wait";
import type { Vec3 } from "../shared/vec";
import { requestAnimDict } from "./streaming";

const core = resourceExport(CORE.resource);

/** Controls each `disable` flag blocks while a progress runs. */
const DISABLED = {
  move: [30, 31, 36, 21, 44],
  car: [63, 64, 71, 72, 75],
  mouse: [1, 2, 106],
  combat: [24, 25, 37, 47, 58, 140, 141, 142, 143, 257, 263, 264],
} as const;

export interface ProgressOptions {
  label: string;
  /** Milliseconds. */
  duration: number;
  anim?: { dict: string; clip: string; flag?: number };
  /** A scenario played in place (`WORLD_HUMAN_HAMMERING`) when there is no `anim`. */
  scenario?: string;
  /** Getting into a vehicle cancels it unless true. */
  allowVehicle?: boolean;
  /** The player may cancel it with ai-core's cancel key (default false). */
  canCancel?: boolean;
  /** Keeps running when the player dies (default false: death cancels). */
  whileDead?: boolean;
  /** Holds the player in place while it runs. */
  freeze?: boolean;
  /** Controls blocked while it runs: walking, driving, looking around, fighting. */
  disable?: { move?: boolean; car?: boolean; mouse?: boolean; combat?: boolean };
  /** The player turns to this point before the bar starts (a pump, a counter, a vehicle). */
  face?: Vec3;
}

/** How long the ped gets to turn towards `face`. */
const FACE_MS = 600;

/** The running progress of this resource (one at a time). */
let running: { canCancel: boolean; cancelled: boolean } | null = null;

on(CORE.clientCancelProgressEvent, () => {
  if (running?.canCancel) running.cancelled = true;
});

/** Cancels this resource's running progress (whether or not the player may). */
export function cancelProgress(): void {
  if (running) running.cancelled = true;
}

export function isProgressRunning(): boolean {
  return running !== null;
}

function disabledControls(disable: ProgressOptions["disable"]): number[] {
  const list: number[] = [];
  if (!disable) return list;
  for (const key of ["move", "car", "mouse", "combat"] as const)
    if (disable[key]) list.push(...DISABLED[key]);
  return list;
}

/**
 * Runs a timed action with ai-core's progress bar and an optional animation or scenario; resolves true when it ran
 * out, false when cancelled (death, a vehicle, the cancel key, `cancelProgress`) or while another one of this
 * resource runs. Checks ten times a second; blocked controls go through the lib's one per-frame `controls` job.
 */
export async function progress(options: ProgressOptions): Promise<boolean> {
  if (running) return false;
  const own = { canCancel: options.canCancel === true, cancelled: false };
  running = own;
  const ped = cache.ped;
  const { anim, scenario, face } = options;
  if (face && cache.vehicle === false) {
    TaskTurnPedToFaceCoord(ped, face.x, face.y, face.z, FACE_MS);
    await sleep(FACE_MS);
  }
  if (anim) {
    await requestAnimDict(anim.dict);
    TaskPlayAnim(
      ped,
      anim.dict,
      anim.clip,
      3,
      3,
      options.duration,
      anim.flag ?? 49,
      0,
      false,
      false,
      false,
    );
  } else if (scenario) TaskStartScenarioInPlace(ped, scenario, 0, true);
  if (options.freeze) FreezeEntityPosition(ped, true);
  const blocked = disabledControls(options.disable);
  if (blocked.length) controls.disable("progress", blocked);
  core.ShowProgress(options.label, options.duration);
  const end = GetGameTimer() + options.duration;
  const done = await new Promise<boolean>((resolve) => {
    const job = every(
      100,
      () => {
        const cancelled =
          own.cancelled ||
          (!options.whileDead && IsEntityDead(cache.ped)) ||
          (!options.allowVehicle && cache.vehicle !== false);
        if (!cancelled && GetGameTimer() < end) return;
        job.stop();
        resolve(!cancelled);
      },
      { name: "progress" },
    );
  });
  if (anim) StopAnimTask(ped, anim.dict, anim.clip, 1);
  else if (scenario) ClearPedTasks(ped);
  if (options.freeze) FreezeEntityPosition(ped, false);
  if (blocked.length) controls.enable("progress");
  core.HideProgress();
  running = null;
  return done;
}
