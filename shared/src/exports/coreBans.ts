import type {
  BanEdit,
  BanInfo,
  BanListPage,
  BanQuery,
  BanRecord,
  BansPage,
  BanTarget,
} from "../bans";

/** ai-core's server exports for bans (checked when a player connects). */
export type BanServerExports = {
  /** Bans an online player (dropped at once) or identifiers; `minutes` left out = permanent. False on wrong arguments. */
  BanPlayer(
    target: BanTarget,
    reason: string,
    minutes?: number,
    by?: number | string,
    done?: (banId: number | null) => void,
  ): boolean;
  /** Lifts an active ban; false when no active ban has that id. */
  UnbanPlayer(banId: number, by?: number | string): boolean;
  IsBanned(target: BanTarget): BanInfo | null;
  /** Active bans, newest first, 50 per page (page 1 first). */
  GetBans(page?: number): BansPage;
  /** Every ban (active, expired, revoked) matching any identifier of the target, newest first, at most 100. */
  GetBanHistory(target: BanTarget, done: (bans: BanRecord[]) => void): void;
  /** A page of bans by state and search (`BanQuery`); `done(null)` on a wrong query or a failed read. */
  ListBans(query: BanQuery, done: (page: BanListPage | null) => void): void;
  /** Changes an active ban's reason and / or end; false when no active ban has that id or the edit is wrong. */
  EditBan(banId: number, edit: BanEdit, by?: number | string): boolean;
};
