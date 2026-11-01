import type { AccountTypeDefinition } from "../definitions";

/** A money account for `TransferMoney`: a loaded player's, or a job's / gang's shared account. */
export type MoneyRef =
  | { source: number; account: string }
  | { owner: "job" | "gang"; id: string; account: string };

/** An account whose ledger is read: a money account, or a stored character's (`id` = its character id). */
export type LedgerRef = MoneyRef | { owner: "character"; id: string; account: string };

/** One ledger row of an account. */
export interface LedgerRow {
  id: number;
  /** Signed: below 0 money left the account. */
  amount: number;
  /** The account's balance right after it. */
  balance: number;
  reason: string;
  /** Who made it (a citizenid or a resource), null when unknown. */
  actor: string | null;
  /** Unix seconds. */
  at: number;
}

/** Which rows: older than the row `before` (keyset), not older than `since` (unix seconds), at most `limit` (1-200, default 50). */
export interface LedgerQuery {
  before?: number;
  since?: number;
  limit?: number;
}

/** A page of ledger rows, newest first; `next` is the `before` of the next page, null on the last. */
export interface LedgerPage {
  rows: LedgerRow[];
  next: number | null;
}

/** ai-core's money exports: player accounts, job and gang accounts, transfers (part of `AiCoreServerExports`). */
export type CoreMoneyServerExports = {
  GetMoney(src: number, account: string): number | null;
  AddMoney(
    src: number,
    account: string,
    amount: number,
    reason?: string,
  ): boolean;
  RemoveMoney(
    src: number,
    account: string,
    amount: number,
    reason?: string,
  ): boolean;
  SetMoney(
    src: number,
    account: string,
    amount: number,
    reason?: string,
  ): boolean;
  GetAccountTypes(): Record<string, AccountTypeDefinition>;

  GetSharedMoney(
    ownerType: "job" | "gang",
    ownerId: string,
    account: string,
  ): number | null;
  AddSharedMoney(
    ownerType: "job" | "gang",
    ownerId: string,
    account: string,
    amount: number,
    reason?: string,
  ): boolean;
  RemoveSharedMoney(
    ownerType: "job" | "gang",
    ownerId: string,
    account: string,
    amount: number,
    reason?: string,
  ): boolean;
  /**
   * Moves `amount` between two accounts in one DB transaction with both ledger rows; `from` also pays `fee`.
   * False when an account is missing, both are the same or `from` cannot pay.
   */
  /** Ledger rows of an account (ai-core writes them a moment after the change), newest first; `done` gets a page. */
  GetAccountHistory(
    account: LedgerRef,
    done: (page: LedgerPage) => void,
    query?: LedgerQuery,
  ): void;
  TransferMoney(
    from: MoneyRef,
    to: MoneyRef,
    amount: number,
    reason?: string,
    fee?: number,
  ): boolean;
};
