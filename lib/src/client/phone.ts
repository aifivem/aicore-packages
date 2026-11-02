import { CORE } from "@aifivem/shared";

/** The local player's phone through ai-core's client phone layer, whatever phone runs (`docs/compat/phone.md`). */
export const phone = {
  /**
   * `fn(phone)` when the local player opens the phone (`phone`: the phone's resource name): once per opening, at most
   * once per 10 s; nothing for a phone without an open signal.
   */
  onUsed(fn: (phone: string) => void): void {
    on(CORE.clientPhoneUsedEvent, (phone: unknown) => {
      if (typeof phone === "string") fn(phone);
    });
  },
};
