/** A per-frame job that can be switched on and off without leaking ticks (an idle tick still costs time). */
export class TickLoop {
  private id: number | null = null;

  constructor(private readonly onFrame: () => void) {}

  get running(): boolean {
    return this.id !== null;
  }

  set(active: boolean): void {
    if (active && this.id === null) this.id = setTick(this.onFrame);
    else if (!active && this.id !== null) {
      clearTick(this.id);
      this.id = null;
    }
  }
}
