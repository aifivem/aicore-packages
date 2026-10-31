/** Grid cells for world streaming (lib `AreaStream` / `AreaFollower`): the same math on server and client. */

/** Cells are clamped to +-16,000 so `cellKey` stays a small integer (a fast Map key). */
const LIMIT = 16_000;
const OFFSET = 16_384;
const clampCell = (v: number): number => Math.max(-LIMIT, Math.min(LIMIT, v));

/** The integer cell of a point on a grid of `size` metres. */
export const gridCell = (
  x: number,
  y: number,
  size: number,
): { cx: number; cy: number } => ({
  cx: clampCell(Math.floor(x / size)),
  cy: clampCell(Math.floor(y / size)),
});

/** One number for a cell (below 2^30). */
export const cellKey = (cx: number, cy: number): number =>
  (clampCell(cx) + OFFSET) * 32_768 + (clampCell(cy) + OFFSET);
