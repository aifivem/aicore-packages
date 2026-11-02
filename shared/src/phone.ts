/** A mail a script sends to a player's phone. */
export interface PhoneMail {
  /** Shown as the sender (a company, "Los Santos Customs"). */
  sender: string;
  subject: string;
  message: string;
}

/** A phone notification on a player's phone. */
export interface PhoneNotification {
  title: string;
  message: string;
  /** Phone app id it belongs to when the phone knows it (`messages`, `mail`, `bank`). */
  app?: string;
}

/** One phone script behind ai-core's phone layer (server side). */
export interface PhoneAdapter {
  resource: string;
  number(source: number): string | null;
  sourceOf(number: string): number | null;
  hasPhone(source: number): boolean;
  /** `to` is a phone number (or the phone's mail address). */
  mail(to: string, mail: PhoneMail): boolean;
  /** A text from one number to another. */
  message(from: string, to: string, text: string): boolean;
  notify(source: number, notification: PhoneNotification): boolean;
}

/**
 * Client half of a phone behind ai-core's phone layer: how it tells that the local player opened it. A phone without
 * a confirmed signal has neither member.
 */
export interface PhoneClientAdapter {
  resource: string;
  /** Registers the phone's open signal (an event or a state bag) once at start; calls `opened()` on each opening. */
  watch?(opened: () => void): void;
  /** The phone's open-state export, for phones with no signal: read once a second while this phone is picked. */
  isOpen?(): boolean;
}

/** ai-core's phone exports: whatever phone script runs answers (none: null / false). */
export type PhoneServerExports = {
  GetPhoneNumber(source: number): string | null;
  GetSourceByPhone(number: string): number | null;
  HasPhone(source: number): boolean;
  /** `to`: a player's server id or a phone number. */
  SendPhoneMail(to: number | string, mail: PhoneMail): boolean;
  SendPhoneMessage(from: string, to: number | string, text: string): boolean;
  PhoneNotify(source: number, notification: PhoneNotification): boolean;
};
