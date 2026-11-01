import { cache } from "../cache";
import {
  holdAnim,
  playAnim,
  stopAnim,
  type AnimOptions,
  type HoldAnimOptions,
} from "./anim";
import { teleport, type TeleportOptions } from "./teleport";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * The local player's ped, like ox_core's player object: position, moves and animations in one place. Reads use
 * `cache.ped` (loops); one-off actions read the ped fresh, so they also work right after a model change.
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
    FreezeEntityPosition(PlayerPedId(), state);
  },

  /**
   * Moves the player and waits for the collision there, behind a fade unless `fade: false`. Without `z` (or with
   * `ground: "find"`) the player lands on the ground under x / y.
   */
  teleport(
    to: { x: number; y: number; z?: number },
    options: TeleportOptions = {},
  ): Promise<void> {
    return teleport(to, options);
  },

  /** Plays an animation on the ped (loads and frees the dictionary); resolves when it started. */
  playAnim(
    dict: string,
    clip: string,
    options: AnimOptions = {},
  ): Promise<void> {
    return playAnim(dict, clip, options);
  },

  stopAnim(): void {
    stopAnim();
  },

  /**
   * Keeps an animation playing (put back within half a second when a fall or a bump interrupts it) until `stop()` or
   * `while` answers false; one hold per resource, a new one replaces the old.
   */
  holdAnim(
    dict: string,
    clip: string,
    options: HoldAnimOptions = {},
  ): { stop(): void } {
    return holdAnim(dict, clip, options);
  },
};
