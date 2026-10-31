/** A reader of one panel record: the parsed value, or null to leave the record out. */
export type RecordReader<T> = (
  key: string,
  raw: Record<string, unknown>,
) => T | null;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** `{ key: record }` -> Map through a per-record reader (null or a non-object drops the record). */
export function readRecords<T>(
  raw: unknown,
  readOne: RecordReader<T>,
): Map<string, T> {
  const out = new Map<string, T>();
  if (!isObject(raw)) return out;
  for (const key in raw) {
    const value = raw[key];
    if (!isObject(value)) continue;
    const parsed = readOne(key, value);
    if (parsed !== null) out.set(key, parsed);
  }
  return out;
}

/**
 * Parsed views of panel files (`AdminPanel` and `AdminWorld` use it): each view is updated on a change before the
 * file's `onChange` handlers run, so a handler reads the new parsed value.
 */
export class FileViews {
  private readonly updaters = new Map<
    string,
    Array<(key: string | undefined, value: unknown) => void>
  >();

  /** `read(file)`: the file's current raw content. */
  constructor(private readonly read: (file: string) => unknown) {}

  /** A file parsed by `parse`, parsed again on every change (settings files). */
  view<T>(file: string, parse: (raw: unknown) => T): { readonly value: T } {
    const box = { value: parse(this.read(file)) };
    this.on(file, () => (box.value = parse(this.read(file))));
    return box;
  }

  /** A records file parsed per record; a change parses only the changed record. */
  records<T>(file: string, readOne: RecordReader<T>): ReadonlyMap<string, T> {
    const live = new LiveRecords(readOne);
    live.reset(this.read(file));
    this.on(file, (key, value) => live.update(key, value, this.read(file)));
    return live.map;
  }

  /** A record of `file` changed (records: its key, `null` = deleted; settings: no key). */
  changed(file: string, key: string | undefined, value: unknown): void {
    for (const update of this.updaters.get(file) ?? []) update(key, value);
  }

  private on(
    file: string,
    update: (key: string | undefined, value: unknown) => void,
  ): void {
    const list = this.updaters.get(file);
    if (list) list.push(update);
    else this.updaters.set(file, [update]);
  }
}

/**
 * A records file parsed record by record and kept current one key at a time (`AdminPanel.records`,
 * `AdminWorld.records`): a full read at start, O(1) per changed record afterwards.
 */
export class LiveRecords<T> {
  readonly map = new Map<string, T>();

  constructor(private readonly readOne: RecordReader<T>) {}

  /** Reads the whole file again. */
  reset(raw: unknown): void {
    this.map.clear();
    for (const [key, value] of readRecords(raw, this.readOne))
      this.map.set(key, value);
  }

  /** One record changed (`null` = deleted); `key` undefined means the whole file was replaced by `whole`. */
  update(key: string | undefined, value: unknown, whole: unknown): void {
    if (key === undefined) return this.reset(whole);
    const parsed = isObject(value) ? this.readOne(key, value) : null;
    if (parsed === null) this.map.delete(key);
    else this.map.set(key, parsed);
  }
}

/** What `RecordObjects` needs of a panel store: `AdminWorld` (client) and `AdminPanel` (server) both fit. */
export interface RecordSource {
  records<T>(file: string, readOne: RecordReader<T>): ReadonlyMap<string, T>;
  onChange(
    file: string,
    handler: (key: string | undefined, value: unknown) => void,
  ): void;
}

/**
 * The world objects of a records file (points, blips, peds, zones) kept in step one record at a time: `build(key,
 * record)` makes one record's objects and returns how to remove them; an edited record removes and rebuilds only its
 * own objects, a deleted one only removes them. A setting every record reads (a blip style) calls `rebuildAll()`.
 * Never `clear()` + add everything on a change: with 10k records one edit would rebuild 10k objects on every client.
 */
export class RecordObjects<T> {
  readonly records: ReadonlyMap<string, T>;
  private readonly built = new Map<string, () => void>();

  constructor(
    source: RecordSource,
    file: string,
    readOne: RecordReader<T>,
    private readonly build: (key: string, record: T) => (() => void) | void,
  ) {
    this.records = source.records(file, readOne);
    source.onChange(file, (key) =>
      key === undefined ? this.rebuildAll() : this.rebuild(key),
    );
    this.rebuildAll();
  }

  /** Removes and builds again one record's objects (its current value; gone when the record is). */
  rebuild(key: string): void {
    this.built.get(key)?.();
    this.built.delete(key);
    const record = this.records.get(key);
    if (record === undefined) return;
    const remove = this.build(key, record);
    if (remove) this.built.set(key, remove);
  }

  /** Every record again (a shared setting changed, or the whole file was replaced). */
  rebuildAll(): void {
    for (const remove of this.built.values()) remove();
    this.built.clear();
    for (const [key, record] of this.records) {
      const remove = this.build(key, record);
      if (remove) this.built.set(key, remove);
    }
  }
}
