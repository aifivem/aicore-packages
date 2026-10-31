import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** The police MDT through ai-core's client MDT layer. */
export const mdt = {
  /** Opens the active MDT for the local player (the MDT checks the job); false when none runs or it cannot be opened from outside. */
  open: (): boolean => core.OpenMdt(),
};
