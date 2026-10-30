/** A point in the world. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Straight distance between two points, in metres. */
export const distance = (a: Vec3, b: Vec3): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** The heading (0-360, GTA's: 0 = north, counter-clockwise) that faces from `from` towards `to`. */
export function headingTo(
  from: Pick<Vec3, "x" | "y">,
  to: Pick<Vec3, "x" | "y">,
): number {
  const deg = (Math.atan2(to.x - from.x, to.y - from.y) * 180) / Math.PI;
  return (-deg + 360) % 360;
}
