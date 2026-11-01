import type { AccountTypeDefinition } from "../definitions";

/** A money account for `TransferMoney`: a loaded player's, or a job's / gang's shared account. */
export type MoneyRef =
  | { source: number; account: string }
  | { owner: "job" | "gang"; id: string; account: string };

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
  TransferMoney(
    from: MoneyRef,
    to: MoneyRef,
    amount: number,
    reason?: string,
    fee?: number,
  ): boolean;
};
