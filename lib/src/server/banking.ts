import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** The banking script through ai-core's banking layer; job money itself always goes through lib `money` / ai-core. */
export const banking = {
  /** Opens the banking script's screen for a player; false when it cannot be opened from outside or none runs. */
  open: (source: number): boolean => core.OpenBank(source),
  /** The banking script's own balance of a job's society account (display only), null when it keeps none. */
  societyBalance: (job: string): number | null =>
    core.GetBankSocietyBalance(job),
  /** The banking script the layer uses, or null. */
  provider: (): string | null => core.GetBankingSystem(),
};
