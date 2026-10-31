/**
 * A bill a script sends through ai-core's billing layer (lib `billing.send`): from a job (fines, service fees) or from
 * a player, to a player. Texts are already translated.
 */
export interface BillRequest {
  /** The player who gets the bill (server id); or `toCitizenid`. */
  to?: number;
  /**
   * The character who gets the bill by citizen id, online or offline (instead of `to`). An offline character gets it
   * only from ai-core's own bills; a billing script needs the player online.
   */
  toCitizenid?: string;
  /** Whole dollars. */
  amount: number;
  /** What it is for ("Speeding", "Engine repair"). */
  label: string;
  /** The player who issues it (officer, mechanic); a bill without `job` pays this player. */
  from?: number;
  /** The job whose account gets the payment; without it the bill is personal (`from` is then required). */
  job?: string;
}

/** A bill as an adapter gets it: the request with what ai-core knows about the players filled in. */
export interface BillSend extends BillRequest {
  /** The recipient's server id (adapters only get bills to online players). */
  to: number;
  toCitizenid: string;
  fromCitizenid?: string;
  fromName?: string;
  /** The job's label from ai-core's job definitions. */
  jobLabel?: string;
}

/** One open (unpaid) bill of a player. */
export interface UnpaidBill {
  /** The billing script's own id or reference. */
  id: string;
  label: string;
  /** What is still owed. */
  amount: number;
  /** Who sent it (job label or player name). */
  sender: string;
}

/** One billing script behind ai-core's billing layer (server side). */
export interface BillingAdapter {
  resource: string;
  /** The version the adapter is written for; ai-core warns when another one runs. Absent for ai-core's own bills. */
  version?: string;
  /** False when the script refused it or cannot send this kind (a personal bill, a bill without an issuer). */
  send(bill: BillSend): boolean;
  /** The player's open bills; `done(null)` when the script cannot list them. Absent = cannot list. */
  unpaid?(
    source: number,
    citizenid: string,
    done: (bills: UnpaidBill[] | null) => void,
  ): void;
  /** The player pays one of their bills; absent when the script takes payments only in its own screen. */
  pay?(source: number, id: string): boolean;
}

const text = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
const id = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;

/** A bill from untrusted input (another resource's export call); null when it is not a valid bill. */
export function toBillRequest(value: unknown): BillRequest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const v = value as Record<string, unknown>;
  const to = id(v.to);
  const toCitizenid =
    typeof v.toCitizenid === "string" &&
    /^[A-Za-z0-9]{1,16}$/.test(v.toCitizenid)
      ? v.toCitizenid
      : undefined;
  const label = text(v.label, 80);
  const amount = v.amount;
  if (
    (to === undefined) === (toCitizenid === undefined) ||
    !label ||
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > 10_000_000
  )
    return null;
  const from = id(v.from);
  const job =
    typeof v.job === "string" && /^[a-z0-9_]{2,32}$/.test(v.job)
      ? v.job
      : undefined;
  if (job === undefined && from === undefined) return null;
  if (to !== undefined && from === to) return null;
  return { to, toCitizenid, amount, label, from, job };
}

/** ai-core's billing exports: whatever billing script runs (ai-core's own bills without one). */
export type BillingServerExports = {
  /** The billing script bills go to ("ai-core" for ai-core's own bills). */
  GetBillingSystem(): string | null;
  /** Sends a bill; false when it is invalid or the billing script refused it. */
  SendBill(bill: BillRequest): boolean;
  /** A player's open bills; `done(null)` when the billing script cannot list them. A callback: no promise crosses a resource boundary. */
  GetUnpaidBills(
    source: number,
    done: (bills: UnpaidBill[] | null) => void,
  ): void;
  /** The player pays one of their open bills; false when refused or the billing script takes payments only in its own screen. */
  PayBill(source: number, id: string): boolean;
};
