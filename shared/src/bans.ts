/** Identifier types a ban matches, as the connection gate sees them (values without the `type:` prefix). */
export const BAN_IDENTIFIERS = ["fivem", "license", "discord", "ip"] as const;
export type BanIdentifier = (typeof BAN_IDENTIFIERS)[number];

/** An active ban (`IsBanned`, `GetBans`). Times in epoch ms; `expires` null = permanent. */
export interface BanInfo {
  /** 0 until the row is written (the ban already holds). */
  id: number;
  identifiers: Partial<Record<BanIdentifier, string>>;
  /** The player's name when banned. */
  name: string;
  reason: string;
  by: string;
  created: number;
  expires: number | null;
}

/** Who to ban or check: an online player's server id, or identifiers (`license:abc` or `abc` under its type). */
export type BanTarget =
  number | { identifiers: Partial<Record<BanIdentifier, string>> };

/** One page of active bans, newest first. */
export interface BansPage {
  bans: BanInfo[];
  total: number;
}

/** A stored ban in any state (`GetBanHistory`, `ListBans`). Times in epoch ms. */
export interface BanRecord extends BanInfo {
  /** When the ban was lifted, null while it was not. */
  revoked: number | null;
  revokedBy: string | null;
}

export type BanStatus = "active" | "expired" | "revoked";

/** A ban's state at `now` (epoch ms; a client passes the server's time, see `ServerClock`). */
export function banStatus(ban: BanRecord, now: number): BanStatus {
  if (ban.revoked !== null) return "revoked";
  return ban.expires !== null && ban.expires <= now ? "expired" : "active";
}

/** Which bans a list shows. */
export const BAN_FILTERS = ["active", "expired", "revoked", "all"] as const;
export type BanFilter = (typeof BAN_FILTERS)[number];

/**
 * Where a list page goes on: the last row's id, and its sort time (`revoked` for revoked bans, `expires` for expired
 * ones; null for active and all, which sort by id).
 */
export interface BanCursor {
  id: number;
  at: number | null;
}

/**
 * A ban list query. `search`: a ban id or a number (`123`: ban id, fivem or discord), `fivem:` / `license:` /
 * `discord:` / `ip:` + value, a 40-hex license, an IPv4, else a name prefix (2+ characters).
 */
export interface BanQuery {
  filter?: BanFilter;
  search?: string;
  cursor?: BanCursor | null;
}

/**
 * One page of a ban list: active and all newest first, revoked by the time they were lifted, expired by the time
 * they ended (latest first). `next` null on the last page.
 */
export interface BanListPage {
  bans: BanRecord[];
  next: BanCursor | null;
}

/** A change to an active ban: a new reason, a new end counted from now (`minutes`; null = permanent). */
export interface BanEdit {
  reason?: string;
  minutes?: number | null;
}

/** Ban lengths the admin tools offer (minutes; null = permanent); `id` names the lang key of each. */
export const BAN_DURATIONS = [
  { id: "1H", minutes: 60 },
  { id: "1D", minutes: 1440 },
  { id: "3D", minutes: 4320 },
  { id: "1W", minutes: 10_080 },
  { id: "2W", minutes: 20_160 },
  { id: "1M", minutes: 43_200 },
  { id: "3M", minutes: 129_600 },
  { id: "PERM", minutes: null },
] as const satisfies ReadonlyArray<{ id: string; minutes: number | null }>;
