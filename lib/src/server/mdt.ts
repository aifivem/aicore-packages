import { CORE, type MdtRecord } from "@aifivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Police MDT records (fines, warrants, arrests, jail) through ai-core's MDT layer; nothing is written while no MDT runs. */
export const mdt = {
  /** Writes a record; false when no MDT runs or it takes no such record. */
  record: (record: MdtRecord): boolean => core.AddMdtRecord(record),
  /**
   * Whether a character (a loaded player's server id or a citizenid) has an active warrant in the active MDT. False
   * when not, when no MDT runs, when the MDT exposes no warrants (`docs/compat/mdt.md`) or ai-core is stopped.
   * ai-core keeps each answer 30 s.
   */
  hasWarrant: (target: number | string): Promise<boolean> =>
    new Promise((resolve) => {
      try {
        core.HasMdtWarrant(target, (wanted) => resolve(wanted === true));
      } catch {
        resolve(false);
      }
    }),
  /** The MDT records go to, or null. */
  provider: (): string | null => core.GetMdtSystem(),
};
