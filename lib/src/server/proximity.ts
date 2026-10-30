/**
 * Who is near whom without scanning every player: OneSync tells the server which players are in each other's scope
 * (`playerEnteredScope` / `playerLeftScope`, ~424 m). A "near" question only measures the few players in scope
 * instead of all 10k online. Players already in scope when the resource starts are found once from a 424 m grid.
 */
const SCOPE_RADIUS = 424;

type Vec = { x: number; y: number; z: number };

const posOf = (source: number): Vec => {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
  return { x, y, z };
};

class Scopes {
  private readonly scopes = new Map<number, Set<number>>();
  private started = false;

  private link(a: number, b: number): void {
    let set = this.scopes.get(a);
    if (!set) this.scopes.set(a, (set = new Set()));
    set.add(b);
  }

  private start(): void {
    if (this.started) return;
    this.started = true;
    on("playerEnteredScope", (data: { for: string; player: string }) => this.link(Number(data.for), Number(data.player)));
    on("playerLeftScope", (data: { for: string; player: string }) => this.scopes.get(Number(data.for))?.delete(Number(data.player)));
    on("playerDropped", () => {
      const source = Number(globalThis.source);
      for (const other of this.scopes.get(source) ?? []) this.scopes.get(other)?.delete(source);
      this.scopes.delete(source);
    });
    this.seed();
  }

  /** The players in scope of each other right now: a grid of scope-sized cells, each player against 9 cells. */
  private seed(): void {
    const cells = new Map<string, { source: number; p: Vec }[]>();
    const all: { source: number; p: Vec }[] = [];
    for (let i = 0; i < GetNumPlayerIndices(); i++) {
      const source = Number(GetPlayerFromIndex(i));
      const entry = { source, p: posOf(source) };
      all.push(entry);
      const key = `${Math.floor(entry.p.x / SCOPE_RADIUS)}:${Math.floor(entry.p.y / SCOPE_RADIUS)}`;
      const cell = cells.get(key);
      if (cell) cell.push(entry);
      else cells.set(key, [entry]);
    }
    for (const { source, p } of all) {
      const cx = Math.floor(p.x / SCOPE_RADIUS);
      const cy = Math.floor(p.y / SCOPE_RADIUS);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const other of cells.get(`${cx + dx}:${cy + dy}`) ?? [])
            if (other.source !== source && Math.hypot(other.p.x - p.x, other.p.y - p.y) <= SCOPE_RADIUS) this.link(source, other.source);
    }
  }

  of(source: number): ReadonlySet<number> {
    this.start();
    return this.scopes.get(source) ?? EMPTY;
  }
}

const EMPTY: ReadonlySet<number> = new Set();
const scopes = new Scopes();

/** Players within `radius` metres of a point, measured only among `candidates`. */
function within(point: Vec, radius: number, candidates: Iterable<number>): number[] {
  const out: number[] = [];
  for (const source of candidates) {
    const p = posOf(source);
    if (Math.hypot(p.x - point.x, p.y - point.y, p.z - point.z) <= radius) out.push(source);
  }
  return out;
}

/** Players within `radius` (up to ~424 m) of a player, that player included. */
export function playersNear(source: number, radius: number): number[] {
  return within(posOf(source), radius, [source, ...scopes.of(source)]);
}

/**
 * Players within `radius` (up to ~424 m) of a networked entity: its owner (a player near it) and the players in that
 * owner's scope. An entity nobody owns (the server) has nobody near it.
 */
export function playersNearEntity(entity: number, radius: number): number[] {
  if (!DoesEntityExist(entity)) return [];
  const owner = NetworkGetEntityOwner(entity);
  if (owner <= 0) return [];
  const [x = 0, y = 0, z = 0] = GetEntityCoords(entity);
  return within({ x, y, z }, radius, [owner, ...scopes.of(owner)]);
}
