import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Whether it is prime time for `job` (the default hours without one), from ai-core's prime time setting (tgiann-policealert's hours while it runs, else ai-core's panel hours). */
export const isPrimeTime = (job?: string): boolean => core.IsPrimeTime(job);
