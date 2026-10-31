/** What an MDT record is about. */
export type MdtRecordKind = "fine" | "warrant" | "arrest" | "jail";

/** A record a script writes into the police MDT through ai-core's MDT layer (lib `mdt.record`); texts already translated. */
export interface MdtRecord {
  kind: MdtRecordKind;
  /** The player the record is about. */
  target: number;
  /** The officer who writes it. */
  by?: number;
  /** What happened ("Speeding", "Armed robbery"). */
  title: string;
  /** A fine's amount in dollars. */
  amount?: number;
  /** A jail sentence in minutes. */
  minutes?: number;
}

/** A record as an adapter gets it: what ai-core knows about the players filled in. */
export interface MdtEntry extends MdtRecord {
  targetCitizenid: string;
  targetName: string;
  byCitizenid?: string;
  byName?: string;
}

/** One MDT behind ai-core's MDT layer (server side). */
export interface MdtAdapter {
  resource: string;
  /** The version the adapter is written for; ai-core warns when another one runs. */
  version?: string;
  /** Writes a record; false when the MDT has no such record kind. Absent = the MDT takes no records from scripts. */
  record?(entry: MdtEntry): boolean;
}

/** An MDT's client half: opens its screen for the local player. */
export interface MdtClientAdapter {
  resource: string;
  /** False when it could not open (the MDT checks the player's job itself). */
  open(): boolean;
}

const KINDS: readonly string[] = ["fine", "warrant", "arrest", "jail"];
const id = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;
const whole = (v: unknown, max: number): number | undefined =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v <= max
    ? v
    : undefined;

/** A record from untrusted input (another resource's export call); null when it is not valid. */
export function toMdtRecord(value: unknown): MdtRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const v = value as Record<string, unknown>;
  const target = id(v.target);
  const title =
    typeof v.title === "string" && v.title.trim()
      ? v.title.trim().slice(0, 120)
      : undefined;
  if (!KINDS.includes(String(v.kind)) || target === undefined || !title)
    return null;
  return {
    kind: v.kind as MdtRecordKind,
    target,
    by: id(v.by),
    title,
    amount: whole(v.amount, 10_000_000),
    minutes: whole(v.minutes, 100_000),
  };
}

/** ai-core's MDT exports (server): whatever MDT runs (none: null / false). */
export type MdtServerExports = {
  GetMdtSystem(): string | null;
  /** Writes a record into the active MDT; false when it is invalid, no MDT runs or it takes no such record. */
  AddMdtRecord(record: MdtRecord): boolean;
};
