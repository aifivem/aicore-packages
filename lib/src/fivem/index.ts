/** Helpers that call natives available on both sides; for `resource/common/` code. Import from "@aicore-fivem/lib/fivem". */

export {
  callExport,
  isResourceStarted,
  optionalExport,
  provideExport,
  registerExport,
  resourceExport,
} from "./exports";
export { createLocale, loadLocaleTexts, LOCALE_CONVAR } from "./locale";
export { every, type EveryOptions, type Job } from "./scheduler/every";
export { ByResource, caller, onStop, plateOf, Reasons } from "./byResource";
