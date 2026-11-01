export interface AreaStreamOptions<T, V> {
  /** Client event: `(reset: boolean, puts: V[], removes: id[], ...extra)`. */
  event: string;
  /** What a client gets of an item. */
  view: (item: T) => V;
  /** Cell size in metres (default 64). */
  cellSize?: number;
  /** Cells around the follower's own cell it knows (default 1: the 3x3 around it). */
  range?: number;
  /** Puts per event; a long list goes as several small reliable events, which keep their order (default 50). */
  chunk?: number;
  /** A player who gets the item wherever they are (the body a player carries). */
  alsoTo?: (item: T) => number | undefined;
  /** Values appended to every event (a server clock for countdowns). */
  extra?: () => unknown[];
}
