import { every } from "../../fivem/scheduler/every";
import { cache } from "../cache";
import { requestAnimDict } from "../streaming";

export interface AnimOptions {
  /** `TaskPlayAnim` flag (default 49: upper body, loop, can move). */
  flag?: number;
  /** ms, -1 = until stopped (default -1). */
  duration?: number;
  blendIn?: number;
  blendOut?: number;
}

export interface HoldAnimOptions extends AnimOptions {
  /** Read every half second: the hold ends (and the animation stops) once it answers false. */
  while?: () => boolean;
}

/** Plays an animation on the ped (loads and frees the dictionary); resolves when it started. */
export async function playAnim(
  dict: string,
  clip: string,
  options: AnimOptions = {},
): Promise<void> {
  await requestAnimDict(dict);
  TaskPlayAnim(
    PlayerPedId(),
    dict,
    clip,
    options.blendIn ?? 8,
    options.blendOut ?? -8,
    options.duration ?? -1,
    options.flag ?? 49,
    0,
    false,
    false,
    false,
  );
  RemoveAnimDict(dict);
}

export function stopAnim(): void {
  ClearPedTasks(PlayerPedId());
}

/** The held animation of this resource: one at a time, put back by one shared job when something interrupts it. */
class AnimHold {
  private current: {
    dict: string;
    clip: string;
    options: HoldAnimOptions;
  } | null = null;
  private readonly job = every(500, () => this.check(), {
    active: false,
    name: "holdAnim",
  });

  start(
    dict: string,
    clip: string,
    options: HoldAnimOptions,
  ): { stop(): void } {
    const hold = { dict, clip, options };
    this.current = hold;
    void playAnim(dict, clip, options);
    this.job.set(true);
    return { stop: () => this.end(hold) };
  }

  private end(hold: AnimHold["current"]): void {
    if (this.current !== hold) return;
    this.current = null;
    this.job.set(false);
    stopAnim();
  }

  private check(): void {
    const hold = this.current;
    if (!hold) return;
    if (hold.options.while && !hold.options.while()) return this.end(hold);
    if (!IsEntityPlayingAnim(cache.ped, hold.dict, hold.clip, 3))
      void playAnim(hold.dict, hold.clip, hold.options);
  }
}

let holds: AnimHold | null = null;

/**
 * Keeps an animation playing (put back within half a second when a fall or a bump interrupts it) until `stop()` or
 * `while` answers false; one hold per resource, a new one replaces the old.
 */
export function holdAnim(
  dict: string,
  clip: string,
  options: HoldAnimOptions = {},
): { stop(): void } {
  return (holds ??= new AnimHold()).start(dict, clip, options);
}
