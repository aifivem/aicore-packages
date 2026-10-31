import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Players' stress through ai-core's stress layer, whatever HUD keeps it (ai-hud, qb-hud, TGIANN HUDs). */
export const stress = {
  /** Adds stress points (0-100 scale); false when no HUD with stress runs. */
  gain: (source: number, amount: number): boolean =>
    amount > 0 && core.AddStress(source, amount),
  /** Takes stress points away; false when no HUD with stress runs. */
  relieve: (source: number, amount: number): boolean =>
    amount > 0 && core.AddStress(source, -amount),
  /** The HUD that keeps stress, or null. */
  provider: (): string | null => core.GetStressSystem(),
};
