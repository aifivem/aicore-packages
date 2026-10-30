import type { Vec3 } from "../shared/vec";
import { cache } from "./cache";

/** What a line probe hit first: the point, the surface normal and the entity (0 = the map). */
export interface RayHit {
  coords: Vec3;
  normal: Vec3;
  entity: number;
}

export interface RaycastOptions {
  /** What the probe tests: 1 map, 2 vehicles, 4 peds, 8 ragdolls, 16 objects (default 1 | 2 | 16). */
  flags?: number;
  /** An entity the probe passes through (default the local ped). */
  ignore?: number;
  /** Probe option bits: 1 ignore glass, 2 ignore see-through, 4 ignore no-collision (default 7). */
  options?: number;
}

/**
 * A line probe answered in the same frame (`StartExpensiveSynchronousShapeTestLosProbe`): what it hit first, or null.
 * It blocks until the test is done, so keep it to one or two per frame.
 */
export function raycast(
  from: Vec3,
  to: Vec3,
  { flags = 1 | 2 | 16, ignore = cache.ped, options = 7 }: RaycastOptions = {},
): RayHit | null {
  const [, hit, end, normal, entity] = GetShapeTestResult(
    StartExpensiveSynchronousShapeTestLosProbe(
      from.x,
      from.y,
      from.z,
      to.x,
      to.y,
      to.z,
      flags,
      ignore,
      options,
    ),
  );
  if (!hit) return null;
  return {
    coords: { x: end[0] ?? 0, y: end[1] ?? 0, z: end[2] ?? 0 },
    normal: { x: normal[0] ?? 0, y: normal[1] ?? 0, z: normal[2] ?? 0 },
    entity,
  };
}
