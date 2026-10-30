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
  /**
   * `true` (default): `z` is the floor (panel points), the game puts the ped's feet on it. `false`: z is the ped's
   * root (`coords()`). `"find"` (also when `z` is missing): the ground under x / y is searched (map waypoint).
   */
  ground?: boolean | "find";
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

/** Heights tried for the ground under a point, bottom to top. */
const PROBE_STEP = 25;
const PROBE_TOP = 1000;

/** Streams the area by standing the (frozen) ped at rising heights until the game knows the ground there; null if never. */
async function findGround(
  ped: number,
  x: number,
  y: number,
  keepVehicle: boolean,
): Promise<number | null> {
  for (let height = 0; height <= PROBE_TOP; height += PROBE_STEP) {
    if (keepVehicle) SetPedCoordsKeepVehicle(ped, x, y, height);
    else SetEntityCoordsNoOffset(ped, x, y, height, false, false, false);
    RequestCollisionAtCoord(x, y, height);
    await sleep(50);
    const [found, groundZ] = GetGroundZFor_3dCoord(x, y, height, false);
    if (found) return groundZ;
  }
  return null;
}

/** Fades the screen out and resolves once it is black. */
export async function fadeOut(ms = 300): Promise<void> {
  DoScreenFadeOut(ms);
  await waitFor(() => IsScreenFadedOut() || undefined, ms + 2000).catch(
    () => undefined,
  );
}

/** Fades the screen back in and resolves when it is clear (or after `ms` + 2 s); the pair of `fadeOut`. */
export async function fadeIn(ms = 400): Promise<void> {
  DoScreenFadeIn(ms);
  await waitFor(() => IsScreenFadedIn() || undefined, ms + 2000).catch(
    () => undefined,
  );
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
  async teleport(
    to: { x: number; y: number; z?: number },
    options: TeleportOptions = {},
  ): Promise<void> {
    const fade = options.fade !== false;
    if (fade) await fadeOut();
    const ped = PlayerPedId();
    let z = to.z ?? 0;
    let ground = options.ground;
    if (to.z === undefined || ground === "find") {
      FreezeEntityPosition(ped, true);
      z =
        ((await findGround(ped, to.x, to.y, options.keepVehicle === true)) ??
          0) + 1;
      FreezeEntityPosition(ped, false);
      ground = false;
    }
    RequestCollisionAtCoord(to.x, to.y, z);
    if (options.keepVehicle) SetPedCoordsKeepVehicle(ped, to.x, to.y, z);
    else if (ground === false)
      SetEntityCoordsNoOffset(ped, to.x, to.y, z, false, false, false);
    else SetEntityCoords(ped, to.x, to.y, z, false, false, false, false);
    if (options.heading !== undefined) SetEntityHeading(ped, options.heading);
    await waitFor(
      () => HasCollisionLoadedAroundEntity(ped) || undefined,
      5000,
    ).catch(() => undefined);
    if (fade) {
      await sleep(100);
      DoScreenFadeIn(400);
    }
  },

  /** Plays an animation on the ped (loads and frees the dictionary); resolves when it started. */
  async playAnim(
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
  },

  stopAnim(): void {
    ClearPedTasks(PlayerPedId());
  },
};
