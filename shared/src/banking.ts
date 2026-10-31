/**
 * One banking script behind ai-core's banking layer (server side). ai-core owns every balance; a banking script that
 * keeps job (society) money of its own is only read for display, and money landing there is moved into ai-core's job
 * account when the script reports it (`watchDeposits` + `take`).
 */
export interface BankingAdapter {
  resource: string;
  /** The version the adapter is written for; ai-core warns when another one runs. Absent for ai-* scripts. */
  version?: string;
  /** The script's own balance of a job's society account; null when it keeps none for the job (or none at all). */
  societyBalance(job: string): number | null;
  /** Opens the script's bank screen for a player; absent when it cannot be opened from outside. */
  open?(source: number): boolean;
  /**
   * Reports money that lands in the script's own society account of one of `jobs` (ai-core's jobs):
   * `deposited(job, amount)`. Called on every pick, after the script restarts and when a job is added; each call
   * replaces the last.
   */
  watchDeposits?(
    jobs: readonly string[],
    deposited: (job: string, amount: number) => void,
  ): void;
  /** Takes reported money out of the script's society account (it moves into ai-core's job account); false when it could not. */
  take?(job: string, amount: number): boolean;
}

/** ai-core's banking exports: whatever banking script runs (none: null / false). */
export type BankingServerExports = {
  /** The banking script the layer uses, or null. */
  GetBankingSystem(): string | null;
  /** Opens the banking script's screen for a player; false when it cannot be opened from outside or none runs. */
  OpenBank(source: number): boolean;
  /** The banking script's own balance of a job's society account (display only; ai-core's job account is the money); null when it keeps none. */
  GetBankSocietyBalance(job: string): number | null;
};
