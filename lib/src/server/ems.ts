import { CORE, type DistressCall } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Medics through ai-core's EMS layer: an EMS script's own count and distress calls, else ai-core's duty counts and alerts. */
export const ems = {
  /** Medics free to take a call in `jobs` (busy ones left out when a dispatch script knows them). */
  available: (jobs: string[]): number => core.GetAvailableMedics(jobs),
  /** Sends a distress call for a player to the medics of `call.jobs`; false when nothing took it. */
  distress: (source: number, call: DistressCall): boolean =>
    core.SendDistress(source, call),
  /** The EMS source the layer uses ("ai-core" for its own duty counts). */
  provider: (): string | null => core.GetEmsSystem(),
};
