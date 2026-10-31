import { CORE } from "@aicore-fivem/shared";
import { optionalExport } from "../fivem/exports";
import { cache } from "./cache";

/** ai-core's answer, kept from its local event; null until first asked or after ai-core stops. */
let down: boolean | null = null;
on(CORE.clientDeadEvent, (value: unknown) => {
  down = value === true;
});
on("onClientResourceStop", (resource: string) => {
  if (resource === "ai-core") down = null;
});

/**
 * The local player's down state through ai-core's medical layer, whatever death script runs (`docs/compat/medical.md`):
 * death scripts keep a downed ped alive to animate it, so `IsEntityDead` alone misses them. A memory read after the
 * first call.
 */
export const medical = {
  isDead(): boolean {
    down ??= optionalExport("ai-core")?.IsDead() ?? null;
    return down === true || IsEntityDead(cache.ped);
  },
  /** `fn(dead)` when the local player goes down or gets up. */
  onChange(fn: (dead: boolean) => void): void {
    on(CORE.clientDeadEvent, (value: unknown) => fn(value === true));
  },
};
