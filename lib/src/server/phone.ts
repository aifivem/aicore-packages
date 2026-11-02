import { CORE, type PhoneMail, type PhoneNotification } from "@aifivem/shared";
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
  /**
   * `fn(source, phone)` when a player with a loaded character opens the phone (`phone`: the phone's resource name):
   * once per opening, at most once per 10 s per player; nothing for a phone without an open signal.
   */
  onUsed(fn: (source: number, phone: string) => void): void {
    on(CORE.phoneUsedEvent, (source: unknown, phone: unknown) => {
      if (typeof source === "number" && typeof phone === "string")
        fn(source, phone);
    });
  },
};
