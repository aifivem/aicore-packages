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

/** Players' hunger and thirst through the same layer (the HUD that keeps them, ai-core's metadata without one). */
export const needs = {
  /** Hunger and thirst to full (admin revive, hospital); false when the player has no character. */
  refill: (source: number): boolean => core.RefillNeeds(source),
  /** Adds hunger or thirst (0-100 scale; a negative amount takes it away), a food or drink's value. */
  add: (source: number, need: "hunger" | "thirst", amount: number): boolean =>
    core.AddNeed(source, need, amount),
};
