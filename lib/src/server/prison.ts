import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Jail sentences through ai-core, whatever prison script runs (`docs/compat/prison.md`). */
export const prison = {
  /** Sends a loaded player to prison for `minutes` (`by`: who sent them, for the log); false while no prison runs. */
  jail: (source: number, minutes: number, by = 0): boolean =>
    core.JailPlayer(source, minutes, by),
  /** Lets a jailed player out; false when not jailed or no prison runs. */
  release: (source: number): boolean => core.ReleasePlayer(source),
  /** Minutes of sentence left, 0 when free. */
  timeLeft: (source: number): number => core.GetJailTime(source),
};
