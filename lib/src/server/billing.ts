import { CORE, type BillRequest, type UnpaidBill } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/**
 * Bills through ai-core's billing layer: whatever billing script runs (tgiann-phone, okokBilling...), else ai-core's
 * own bills (the player pays from a list on screen, the money moves when they pay).
 */
export const billing = {
  /** Sends a bill from a job (`job`, fines and service fees) or a player (`from`) to `to` (or `toCitizenid`, also offline with ai-core's own bills); false when refused. */
  send: (bill: BillRequest): boolean => core.SendBill(bill),
  /** The player's open bills (null when the billing script cannot list them). */
  unpaid: (source: number): Promise<UnpaidBill[] | null> =>
    new Promise((resolve) => core.GetUnpaidBills(source, resolve)),
  /** The player pays one of their open bills; false when refused or the billing script takes payments only in its own screen. */
  pay: (source: number, id: string): boolean => core.PayBill(source, id),
  /** The billing script bills go to ("ai-core" for ai-core's own bills). */
  provider: (): string | null => core.GetBillingSystem(),
};
