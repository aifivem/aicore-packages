import type { Vec3 } from "./vec";

/** Zone geometry (client `Zones`, server-side area checks). No natives. */
export type ZoneShape =
  /** A ball around a point. */
  | { type: "sphere"; center: Vec3; radius: number }
  /** A circle on the ground plane, `height` metres up and down from the centre. */
  | { type: "cylinder"; center: Vec3; radius: number; height: number }
  /** A ground polygon (x, y points in order) between two heights. */
  | {
      type: "poly";
      points: Array<{ x: number; y: number }>;
      minZ: number;
      maxZ: number;
    };

/** Whether a point lies inside a zone shape. */
export function zoneContains(
  shape: ZoneShape,
  x: number,
  y: number,
  z: number,
): boolean {
  switch (shape.type) {
    case "sphere": {
      const dx = x - shape.center.x;
      const dy = y - shape.center.y;
      const dz = z - shape.center.z;
      return dx * dx + dy * dy + dz * dz <= shape.radius * shape.radius;
    }
    case "cylinder": {
      const dx = x - shape.center.x;
      const dy = y - shape.center.y;
      return (
        dx * dx + dy * dy <= shape.radius * shape.radius &&
        Math.abs(z - shape.center.z) <= shape.height
      );
    }
    case "poly": {
      if (z < shape.minZ || z > shape.maxZ) return false;
      // Ray casting: count the edges a ray to +x crosses.
      let inside = false;
      const p = shape.points;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const a = p[i]!;
        const b = p[j]!;
        if (
          a.y > y !== b.y > y &&
          x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
        )
          inside = !inside;
      }
      return inside;
    }
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

/** Ground bounding box of a shape: [minX, minY, maxX, maxY]. */
export function zoneBounds(shape: ZoneShape): [number, number, number, number] {
  if (shape.type !== "poly")
    return [
      shape.center.x - shape.radius,
      shape.center.y - shape.radius,
      shape.center.x + shape.radius,
      shape.center.y + shape.radius,
    ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of shape.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return [minX, minY, maxX, maxY];
}

/**
 * A panel `zone` widget's corners as a poly shape: the z range is the corners' lowest and highest z widened by
 * `height` metres; null with fewer than three corners.
 */
export function polyFromCorners(
  corners: readonly Vec3[],
  height: number,
): Extract<ZoneShape, { type: "poly" }> | null {
  if (corners.length < 3) return null;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const c of corners) {
    minZ = Math.min(minZ, c.z);
    maxZ = Math.max(maxZ, c.z);
  }
  return {
    type: "poly",
    points: corners.map(({ x, y }) => ({ x, y })),
    minZ: minZ - height,
    maxZ: maxZ + height,
  };
}
