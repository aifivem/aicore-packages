/** A point in the world. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Straight distance between two points, in metres. */
export const distance = (a: Vec3, b: Vec3): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Distance on the ground plane (x / y only), in metres. */
export const flatDistance = (
  a: Pick<Vec3, "x" | "y">,
  b: Pick<Vec3, "x" | "y">,
): number => Math.hypot(a.x - b.x, a.y - b.y);

/** The heading (0-360, GTA's: 0 = north, counter-clockwise) that faces from `from` towards `to`. */
export function headingTo(
  from: Pick<Vec3, "x" | "y">,
  to: Pick<Vec3, "x" | "y">,
): number {
  const deg = (Math.atan2(to.x - from.x, to.y - from.y) * 180) / Math.PI;
  return (-deg + 360) % 360;
}

/** The item nearest to `point` (3D, `pos` reads an item's position), within `max` metres; undefined when none. */
export function nearestOf<T>(
  items: Iterable<T>,
  point: Vec3,
  pos: (item: T) => Vec3,
  max = Infinity,
): T | undefined {
  let best: T | undefined;
  let bestSq = max * max;
  for (const item of items) {
    const p = pos(item);
    const dx = p.x - point.x;
    const dy = p.y - point.y;
    const dz = p.z - point.z;
    const sq = dx * dx + dy * dy + dz * dz;
    if (sq <= bestSq) {
      bestSq = sq;
      best = item;
    }
  }
  return best;
}
