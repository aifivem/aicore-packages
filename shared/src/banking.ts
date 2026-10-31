/** A society account's owner kind: a job's or a gang's account, named by the job / gang. */
export type SocietyType = "job" | "gang";

/**
 * A banking script's own job and gang accounts, reached through its documented exports (ai-core's `bankAccounts`
 * modes). `own`: ai-core's job / gang `bank` account changes go to `add` / `remove` and reads to `balance` for every
 * job / gang the script `has`. `core`: ai-core keeps the money and writes each change with `set`; changes made in the
 * script (its screen) come back through `watch`. A script without `set` only reports ai-core's balance in `core`.
 */
export interface BankingAccounts {
  /** Whether the script keeps an account for this job / gang. */
  has(type: SocietyType, name: string): boolean;
  /** The script's balance of the account; null when it has none. */
  balance(type: SocietyType, name: string): number | null;
  /** Adds to the script's account; false when it refused (no account). */
  add(type: SocietyType, name: string, amount: number): boolean;
  /** Removes from the script's account; false when it refused (no account, not enough money). */
  remove(type: SocietyType, name: string, amount: number): boolean;
  /** Sets the script's balance (`core` mode: ai-core's balance); false when it refused. */
  set?(type: SocietyType, name: string, amount: number): boolean;
  /**
   * Reports balance changes of the listed accounts made inside the script: `changed(type, name, delta, balance)`.
   * Each call replaces the last; null stops reporting. Changes caused by `set` are reported too (the caller ignores
   * them).
   */
  watch?(
    owners: Readonly<Record<SocietyType, readonly string[]>> | null,
    changed: (
      type: SocietyType,
      name: string,
      delta: number,
      balance: number,
    ) => void,
  ): void;
}

/** One banking script behind ai-core's banking layer (server side). */
export interface BankingAdapter {
  resource: string;
  /** The version the adapter is written for; ai-core warns when another one runs. Absent for ai-* scripts. */
  version?: string;
  /** The script's own balance of a job's society account; null when it keeps none for the job (or none at all). */
  societyBalance(job: string): number | null;
  /** Opens the script's bank screen for a player; absent when it cannot be opened from outside. */
  open?(source: number): boolean;
  /** Its own job / gang accounts, when its exports reach them; absent when they cannot be linked. */
  accounts?: BankingAccounts;
}

/** ai-core's banking exports: whatever banking script runs (none: null / false). */
export type BankingServerExports = {
  /** The banking script the layer uses, or null. */
  GetBankingSystem(): string | null;
  /** Opens the banking script's screen for a player; false when it cannot be opened from outside or none runs. */
  OpenBank(source: number): boolean;
  /** A job's society balance: ai-core's job `bank` account in `core` mode, the script's own in `own` mode; null when none runs or it keeps none. */
  GetBankSocietyBalance(job: string): number | null;
};
