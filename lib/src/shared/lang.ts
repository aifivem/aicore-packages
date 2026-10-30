/** Fills `{0}`, `{1}`... with the arguments by position (a translation may reorder or repeat them). */
export function formatText(
  template: string,
  args: ReadonlyArray<string | number>,
): string {
  return template.replace(/\{(\d+)\}/g, (match, index: string) => {
    const value = args[Number(index)];
    return value === undefined ? match : String(value);
  });
}

/**
 * A NUI page's lang texts (its client sends them with the screen): `translate` fills `{0}` placeholders and answers
 * the key itself when a text is missing; `subscribe` / `snapshot` fit React's `useSyncExternalStore`. Methods are
 * bound, so they can be passed around as plain functions.
 */
export class LangTexts {
  private texts: Record<string, string> = {};
  private readonly listeners = new Set<() => void>();

  /** Replaces every text and tells the subscribers. */
  readonly set = (next: Record<string, string>): void => {
    this.texts = next;
    for (const listener of this.listeners) listener();
  };

  /** The text of `key` with `{0}`, `{1}`... filled in; the key itself when it is missing. */
  readonly translate = (key: string, ...args: Array<string | number>): string =>
    formatText(this.texts[key] ?? key, args);

  /** Calls `listener` after each `set`; answers the unsubscribe function. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** The current texts (a new object after each `set`). */
  readonly snapshot = (): Record<string, string> => this.texts;
}
