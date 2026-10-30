/** A point in the world. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Straight distance between two points, in metres. */
export const distance = (a: Vec3, b: Vec3): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
