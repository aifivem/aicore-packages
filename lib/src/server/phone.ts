import {
  CORE,
  type PhoneMail,
  type PhoneNotification,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Phones through ai-core (tgiann-phone, lb-phone...): numbers, mails, texts, notifications; null / false without one. */
export const phone = {
  number: (source: number): string | null => core.GetPhoneNumber(source),
  sourceOf: (number: string): number | null => core.GetSourceByPhone(number),
  hasPhone: (source: number): boolean => core.HasPhone(source),
  /** `to`: a player's server id or a phone number. */
  mail: (to: number | string, mail: PhoneMail): boolean =>
    core.SendPhoneMail(to, mail),
  message: (from: string, to: number | string, text: string): boolean =>
    core.SendPhoneMessage(from, to, text),
  notify: (source: number, notification: PhoneNotification): boolean =>
    core.PhoneNotify(source, notification),
};
