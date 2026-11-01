import type { Target } from "./adapter";
import { oxApi, sleeplessInteract } from "./oxTarget";
import { qbTarget } from "./qbTarget";
import { interact } from "./interactTarget";

/**
 * Win order: ai-target, then TGIANN, then the others. Scripts that `provide` ox_target or qb-target come before those
 * names, because a provided name reads started too; interact goes last (it often runs next to a target as a
 * dependency of other scripts).
 */
export const TARGETS: readonly Target[] = [
  { resource: "ai-target", adapter: oxApi("ai-target") },
  // Answers the ox_target API under `tgiann-target` and `ox_target`, not under its own name.
  { resource: "tgiann-radialmenu-target", adapter: oxApi("tgiann-target") },
  { resource: "tgiann-target", adapter: oxApi("tgiann-target") },
  { resource: "sleepless_interact", adapter: sleeplessInteract },
  { resource: "ox_target", adapter: oxApi("ox_target") },
  { resource: "qb-target", adapter: qbTarget },
  { resource: "interact", adapter: interact },
];
