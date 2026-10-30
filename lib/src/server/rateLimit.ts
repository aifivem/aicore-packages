/**
 * One in-flight action per player. `run` returns `busy` instead of starting a second copy.
 * Call `release(source)` from playerDropped.
 */
export class SourceLock {
  private readonly active = new Set<number>()

  async run<T, B>(
    source: number,
    busy: B,
    task: () => Promise<T>
  ): Promise<T | B> {
    if (this.active.has(source)) return busy
    this.active.add(source)
    try {
      return await task()
    } finally {
      this.active.delete(source)
    }
  }

  release(source: number): void {
    this.active.delete(source)
  }
}

/** Per-player burst limit: at most `count` actions inside any `windowMs`. Call `release(source)` from playerDropped. */
export class RateLimit {
  private readonly hits = new Map<number, number[]>()

  constructor(
    private readonly count: number,
    private readonly windowMs: number
  ) {}

  take(source: number): boolean {
    const now = GetGameTimer()
    const recent = (this.hits.get(source) ?? []).filter(
      (at) => now - at < this.windowMs
    )
    if (recent.length >= this.count) {
      this.hits.set(source, recent)
      return false
    }
    recent.push(now)
    this.hits.set(source, recent)
    return true
  }

  release(source: number): void {
    this.hits.delete(source)
  }
}
