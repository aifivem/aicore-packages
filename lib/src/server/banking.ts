import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** The banking script through ai-core's banking layer; job money itself always goes through lib `money` / ai-core. */
export const banking = {
  /** Opens the banking script's screen for a player; false when it cannot be opened from outside or none runs. */
  open: (source: number): boolean => core.OpenBank(source),
  /** A job's society balance (display): ai-core's job account in the `core` account mode, the script's own in `own`; null when none runs. */
  societyBalance: (job: string): number | null =>
    core.GetBankSocietyBalance(job),
  /** The banking script the layer uses, or null. */
  provider: (): string | null => core.GetBankingSystem(),
};
