import { Mirror, type StateParse } from "./mirror";

/** One GlobalState key (shared state everyone needs): read once, then kept by its change handler. */
export class GlobalKey<T> extends Mirror<"global", T> {
  constructor(key: string, parse: StateParse<T>) {
    super(key, parse);
    const raw: unknown = GlobalState[key];
    this.values.set("global", raw == null ? undefined : parse(raw));
    AddStateBagChangeHandler(
      key,
      "global",
      (_bag: string, _key: string, value: unknown) =>
        this.store("global", value),
    );
  }

  get(): T | undefined {
    return this.values.get("global");
  }

  protected put(value: T | undefined): void {
    this.apply("global", value);
  }
}

type PrefixListener = (key: string, value: unknown) => void;
const prefixListeners = new Map<string, Set<PrefixListener>>();
let prefixHandler = false;

/** One wildcard handler on the global bag per resource, shared by every `GlobalGroup`. */
function listenPrefix(prefix: string, listener: PrefixListener): void {
  let set = prefixListeners.get(prefix);
  if (!set) prefixListeners.set(prefix, (set = new Set()));
  set.add(listener);
  if (prefixHandler) return;
  prefixHandler = true;
  AddStateBagChangeHandler(
    "",
    "global",
    (_bag: string, key: string, value: unknown) => {
      for (const [p, listeners] of prefixListeners)
        if (key.startsWith(p)) for (const l of listeners) l(key, value);
    },
  );
}

/** Many GlobalState keys with one prefix (`door:<id>`, `rob:<id>`), by the id after the prefix. */
export class GlobalGroup<T> extends Mirror<string, T> {
  constructor(
    readonly prefix: string,
    parse: StateParse<T>,
  ) {
    super(prefix, parse);
    const keys: unknown = GetStateBagKeys("global");
    for (const key of Array.isArray(keys) ? keys : []) {
      if (typeof key !== "string" || !key.startsWith(prefix)) continue;
      const raw: unknown = GlobalState[key];
      this.values.set(
        key.slice(prefix.length),
        raw == null ? undefined : parse(raw),
      );
    }
    listenPrefix(prefix, (key, value) =>
      this.store(key.slice(prefix.length), value),
    );
  }

  get(id: string): T | undefined {
    return this.values.get(id);
  }

  protected put(id: string, value: T | undefined): void {
    this.apply(id, value);
  }

  /** Every id with a value. */
  ids(): IterableIterator<string> {
    return this.values.keys();
  }
}
