import {
  CORE,
  type BanEdit,
  type BanInfo,
  type BanListPage,
  type BanQuery,
  type BanRecord,
  type BansPage,
  type BanTarget,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Bans through ai-core (checked when a player connects; logged on ai-core's `bans` channel). */
export const bans = {
  /**
   * Bans an online player (dropped at once) or identifiers (`{ identifiers: { license, fivem, discord, ip } }`);
   * `minutes` left out = permanent. Resolves the ban id once written (null when the arguments are wrong or the write
   * failed; the ban holds from the call either way).
   */
  ban: (
    target: BanTarget,
    reason: string,
    minutes?: number,
    by?: number | string,
  ): Promise<number | null> =>
    new Promise((resolve) => {
      if (!core.BanPlayer(target, reason, minutes, by, resolve)) resolve(null);
    }),
  /** Lifts an active ban; false when no active ban has that id. */
  unban: (banId: number, by?: number | string): boolean =>
    core.UnbanPlayer(banId, by),
  /** Changes an active ban's reason and / or end (`minutes` from now, null = permanent); false when refused. */
  edit: (banId: number, edit: BanEdit, by?: number | string): boolean =>
    core.EditBan(banId, edit, by),
  /** The active ban of an online player or identifiers, or null. */
  isBanned: (target: BanTarget): BanInfo | null => core.IsBanned(target),
  /** Active bans, newest first, 50 per page. */
  list: (page = 1): BansPage => core.GetBans(page),
  /** Every ban of a player or identifiers (active, expired, revoked), newest first, at most 100. */
  history: (target: BanTarget): Promise<BanRecord[]> =>
    new Promise((resolve) => core.GetBanHistory(target, resolve)),
  /** A page of bans by state and search, keyset paged (`page.next` as the next `cursor`); null on a wrong query. */
  search: (query: BanQuery): Promise<BanListPage | null> =>
    new Promise((resolve) => core.ListBans(query, resolve)),
};
