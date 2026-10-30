import { CORE, type DispatchAlert } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/**
 * Police (and other job) alerts through ai-core's dispatch layer: the active alert system (ai-policealert's alert cards,
 * tgiann-policealert, or another the panel picks) shows them to on-duty members of `jobs` (default the police jobs).
 */
export const dispatch = {
  /** Sends an alert; false when no alert system runs or the alert is invalid. */
  alert: (alert: DispatchAlert): boolean => core.SendDispatchAlert(alert),
};
