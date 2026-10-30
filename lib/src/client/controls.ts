import { TickLoop } from "./tickLoop";

/**
 * Disabled controls of this resource, one per-frame job for all of them: each reason (`cuffed`, `seatbelt`, `menu`)
 * adds its controls and removes them when it ends; the job runs only while any reason is active.
 */
class Controls {
  private readonly sets = new Map<
    string,
    { group: number; controls: readonly number[] }
  >();
  /** Flat [group, control, group, control...] of every active reason, rebuilt on change (nothing allocated per frame). */
  private flat: number[] = [];
  private readonly tick = new TickLoop(() => {
    const flat = this.flat;
    for (let i = 0; i < flat.length; i += 2)
      DisableControlAction(flat[i] ?? 0, flat[i + 1] ?? 0, true);
  });

  /** Disables `controls` (in input group `group`, default 0) every frame until `enable(reason)`. */
  disable(reason: string, controls: readonly number[], group = 0): void {
    this.sets.set(reason, { group, controls });
    this.rebuild();
  }

  enable(reason: string): void {
    if (this.sets.delete(reason)) this.rebuild();
  }

  isDisabled(reason: string): boolean {
    return this.sets.has(reason);
  }

  private rebuild(): void {
    this.flat = [];
    for (const { group, controls } of this.sets.values())
      for (const c of controls) this.flat.push(group, c);
    this.tick.set(this.flat.length > 0);
  }
}

export const controls = new Controls();
