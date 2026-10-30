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
  /** Reasons that disable every control, each with the controls it keeps. */
  private readonly all = new Map<string, readonly number[]>();
  /** Flat [group, control, group, control...] of every active reason, rebuilt on change (nothing allocated per frame). */
  private flat: number[] = [];
  /** Controls every `disableAll` reason keeps (and no `disable` reason takes). */
  private kept: number[] = [];
  private readonly tick = new TickLoop(() => {
    if (this.all.size > 0) {
      DisableAllControlActions(0);
      DisableAllControlActions(1);
      DisableAllControlActions(2);
      const kept = this.kept;
      for (let i = 0; i < kept.length; i++)
        EnableControlAction(0, kept[i] ?? 0, true);
    }
    const flat = this.flat;
    for (let i = 0; i < flat.length; i += 2)
      DisableControlAction(flat[i] ?? 0, flat[i + 1] ?? 0, true);
  });

  /** Disables `controls` (in input group `group`, default 0) every frame until `enable(reason)`. */
  disable(reason: string, controls: readonly number[], group = 0): void {
    this.sets.set(reason, { group, controls });
    this.rebuild();
  }

  /**
   * Disables every control (input groups 0-2) every frame until `enable(reason)`, except `except` (group 0: camera
   * look, push to talk...). Read the disabled ones with `IsDisabledControlPressed` (noclip, free camera).
   */
  disableAll(reason: string, except: readonly number[] = []): void {
    this.all.set(reason, except);
    this.rebuild();
  }

  enable(reason: string): void {
    const a = this.sets.delete(reason);
    const b = this.all.delete(reason);
    if (a || b) this.rebuild();
  }

  isDisabled(reason: string): boolean {
    return this.sets.has(reason) || this.all.has(reason);
  }

  private rebuild(): void {
    this.flat = [];
    const taken = new Set<number>();
    for (const { group, controls } of this.sets.values())
      for (const c of controls) {
        this.flat.push(group, c);
        if (group === 0) taken.add(c);
      }
    const lists = [...this.all.values()];
    this.kept = (lists[0] ?? []).filter(
      (c) => !taken.has(c) && lists.every((list) => list.includes(c)),
    );
    this.tick.set(this.flat.length > 0 || this.all.size > 0);
  }
}

export const controls = new Controls();
