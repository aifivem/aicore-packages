import { sleep, waitFor } from "../shared";
import { cache } from "./cache";
import { requestAnimDict } from "./streaming";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TeleportOptions {
  heading?: number;
  /** `z` is the floor (panel points): the game puts the ped's feet on it. Otherwise z is the ped's root (`coords()`). Default true. */
  ground?: boolean;
  /** Behind a screen fade (default true). */
  fade?: boolean;
  /** Take the vehicle the player sits in along (default false). */
  keepVehicle?: boolean;
}

export interface AnimOptions {
  /** `TaskPlayAnim` flag (default 49: upper body, loop, can move). */
  flag?: number;
  /** ms, -1 = until stopped (default -1). */
  duration?: number;
  blendIn?: number;
  blendOut?: number;
}

/** Fades the screen out and resolves once it is black. */
export async function fadeOut(ms = 300): Promise<void> {
  DoScreenFadeOut(ms);
  await waitFor(() => IsScreenFadedOut() || undefined, ms + 2000).catch(() => undefined);
}

/**
 * The local player's ped, like ox_core's player object: position, moves and animations in one place, reading
 * `cache.ped` (never `PlayerPedId()` in a loop).
 */
export const player = {
  get ped(): number {
    return cache.ped;
  },

  coords(): Vec3 {
    const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
    return { x, y, z };
  },

  heading(): number {
    return GetEntityHeading(cache.ped);
  },

  /** Distance from the ped to a point, in metres. */
  distanceTo(point: Vec3): number {
    const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
    return Math.hypot(x - point.x, y - point.y, z - point.z);
  },

  freeze(state: boolean): void {
    FreezeEntityPosition(cache.ped, state);
  },

  /** Moves the player and waits for the collision there, behind a fade unless `fade: false`. */
  async teleport(to: Vec3, options: TeleportOptions = {}): Promise<void> {
    const fade = options.fade !== false;
    if (fade) await fadeOut();
    const ped = cache.ped;
    RequestCollisionAtCoord(to.x, to.y, to.z);
    if (options.keepVehicle) SetPedCoordsKeepVehicle(ped, to.x, to.y, to.z);
    else if (options.ground === false) SetEntityCoordsNoOffset(ped, to.x, to.y, to.z, false, false, false);
    else SetEntityCoords(ped, to.x, to.y, to.z, false, false, false, false);
    if (options.heading !== undefined) SetEntityHeading(ped, options.heading);
    await waitFor(() => HasCollisionLoadedAroundEntity(ped) || undefined, 5000).catch(() => undefined);
    if (fade) {
      await sleep(100);
      DoScreenFadeIn(400);
    }
  },

  /** Plays an animation on the ped (loads and frees the dictionary); resolves when it started. */
  async playAnim(dict: string, clip: string, options: AnimOptions = {}): Promise<void> {
    await requestAnimDict(dict);
    TaskPlayAnim(cache.ped, dict, clip, options.blendIn ?? 8, options.blendOut ?? -8, options.duration ?? -1, options.flag ?? 49, 0, false, false, false);
    RemoveAnimDict(dict);
  },

  stopAnim(): void {
    ClearPedTasks(cache.ped);
  },
};
