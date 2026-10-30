import { CORE, type MoneyRef } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Money moves through ai-core that need more than one account change. */
export const money = {
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
};
