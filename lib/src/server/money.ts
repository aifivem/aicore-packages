import {
  CORE,
  type LedgerPage,
  type LedgerQuery,
  type LedgerRef,
  type MoneyRef,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);
type GroupType = "job" | "gang";

/** Money through ai-core: a loaded player's accounts, job / gang accounts, transfers and the ledger. */
export const money = {
  /** A loaded player's balance of an account (`cash`, `bank`...); null when not loaded or no such account. */
  get: (source: number, account: string): number | null =>
    core.GetMoney(source, account),
  /** Adds a whole amount with a ledger row (`reason` defaults to the calling resource); false when refused. */
  add: (
    source: number,
    account: string,
    amount: number,
    reason?: string,
  ): boolean => core.AddMoney(source, account, amount, reason),
  /** Takes a whole amount; false when the account cannot pay (or the player is not loaded). */
  remove: (
    source: number,
    account: string,
    amount: number,
    reason?: string,
  ): boolean => core.RemoveMoney(source, account, amount, reason),
  set: (
    source: number,
    account: string,
    amount: number,
    reason?: string,
  ): boolean => core.SetMoney(source, account, amount, reason),
  /** A job's or gang's account balance (`bank` is the society money); null when it has none. */
  sharedGet: (type: GroupType, id: string, account: string): number | null =>
    core.GetSharedMoney(type, id, account),
  sharedAdd: (
    type: GroupType,
    id: string,
    account: string,
    amount: number,
    reason?: string,
  ): boolean => core.AddSharedMoney(type, id, account, amount, reason),
  sharedRemove: (
    type: GroupType,
    id: string,
    account: string,
    amount: number,
    reason?: string,
  ): boolean => core.RemoveSharedMoney(type, id, account, amount, reason),
  /**
   * Moves `amount` from one account to another (a player's `{ source, account }` or a job's / gang's
   * `{ owner, id, account }`) in one transaction with both ledger rows; `from` also pays `fee`. False when an
   * account is missing, both are the same or `from` cannot pay.
   */
  transfer: (
    from: MoneyRef,
    to: MoneyRef,
    amount: number,
    reason?: string,
    fee?: number,
  ): boolean => core.TransferMoney(from, to, amount, reason, fee),
  /** Ledger rows of an account, newest first (also a stored character's: `{ owner: "character", id, account }`). */
  history: (account: LedgerRef, query?: LedgerQuery): Promise<LedgerPage> =>
    new Promise((resolve) => core.GetAccountHistory(account, resolve, query)),
};
