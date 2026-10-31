import { CORE, type MdtRecord } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Police MDT records (fines, warrants, arrests, jail) through ai-core's MDT layer; nothing is written while no MDT runs. */
export const mdt = {
  /** Writes a record; false when no MDT runs or it takes no such record. */
  record: (record: MdtRecord): boolean => core.AddMdtRecord(record),
  /** The MDT records go to, or null. */
  provider: (): string | null => core.GetMdtSystem(),
};
