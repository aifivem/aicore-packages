import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** The weather and time sync of whatever weather script runs, paused while a reason holds (an interior, a scene). */
export const world = {
  pauseSync: (reason: string): void => core.PauseWorldSync(reason),
  resumeSync: (reason: string): void => core.ResumeWorldSync(reason),
};
