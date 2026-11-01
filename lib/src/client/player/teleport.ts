import { sleep, waitFor } from "../../shared";
import { fadeOut } from "./fade";

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

/** Heights tried for the ground under a point, bottom to top. */
const PROBE_STEP = 25;
const PROBE_TOP = 1000;

/**
 * The lowest ground under a point that is not inside an interior: the (frozen) ped stands at rising heights, each
 * probe waits for the collision there (an unloaded street would be skipped and the roof above taken), and a surface
 * inside an MLO / IPL interior is passed over for the next one up. Null when there is no ground at all.
 */
async function findGround(
  ped: number,
  x: number,
  y: number,
  keepVehicle: boolean,
): Promise<number | null> {
  let indoor: number | null = null;
  for (let height = 0; height <= PROBE_TOP; height += PROBE_STEP) {
    if (keepVehicle) SetPedCoordsKeepVehicle(ped, x, y, height);
    else SetEntityCoordsNoOffset(ped, x, y, height, false, false, false);
    RequestCollisionAtCoord(x, y, height);
    await sleep(50);
    await waitFor(
      () => HasCollisionLoadedAroundEntity(ped) || undefined,
      500,
      50,
    ).catch(() => undefined);
    const [found, groundZ] = GetGroundZFor_3dCoord(x, y, height, false);
    if (!found) continue;
    if (GetInteriorAtCoords(x, y, groundZ + 1) === 0) return groundZ;
    indoor ??= groundZ;
  }
  // Every surface is indoors (a covered spot): the lowest one rather than nothing.
  return indoor;
}

/**
 * Moves the player and waits for the collision there, behind a fade unless `fade: false`. Without `z` (or with
 * `ground: "find"`) the player lands on the ground under x / y.
 */
export async function teleport(
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
}
