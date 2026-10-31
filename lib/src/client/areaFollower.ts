import { every } from "../fivem/scheduler";
import { gridCell } from "../shared/grid";
import { cache } from "./cache";

/**
 * Tells the server this player's grid cell whenever it changes (one `every` job, 2 s, while started), for a server
 * `AreaStream` that follows reported cells (`followReported`). Create once at module level.
 */
export class AreaFollower {
  private cell = "";
  private readonly job = every(2000, () => this.check(), {
    active: false,
    name: "areaFollower",
  });

  /** `event` gets `(cx, cy)`; `cellSize` must match the server stream's. */
  constructor(
    private readonly event: string,
    private readonly cellSize = 64,
  ) {}

  /** Sends the cell now and on every change. */
  start(): void {
    this.cell = "";
    this.check();
    this.job.set(true);
  }

  stop(): void {
    this.job.set(false);
  }

  private check(): void {
    const [x = 0, y = 0] = GetEntityCoords(cache.ped, false);
    const { cx, cy } = gridCell(x, y, this.cellSize);
    const key = `${cx}:${cy}`;
    if (key === this.cell) return;
    this.cell = key;
    emitNet(this.event, cx, cy);
  }
}
