import { ADMIN } from "@aicore-fivem/shared";
import { createLogger, isRecord } from "../shared";
import { triggerServerCallback } from "./callback";
import { onServerEvent } from "./netEvent";

type Data = Record<string, unknown>;
/** A record changed (records: its key; settings: no key, the whole object); `null` = deleted. */
type ChangeHandler = (key: string | undefined, value: unknown) => void;

/**
 * The client copy of a resource's world panel files (`sync: "all"`): the file FiveM cached at start, then the
 * records changed since start (asked once), then live changes. Never polls.
 */
export class AdminWorld {
  private readonly data = new Map<string, Data>();
  private readonly handlers = new Map<string, ChangeHandler[]>();
  private readonly resource = GetCurrentResourceName();
  /** Resolves once the changes since start are applied (or could not be loaded): the data is current from then on. */
  readonly ready: Promise<void>;

  /** `files`: the world files this client mirrors (each must be in the resource's `files`). */
  constructor(files: string[]) {
    const log = createLogger(this.resource);
    for (const file of files) {
      const raw = LoadResourceFile(this.resource, `data/${file}.json`);
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        this.data.set(file, isRecord(parsed) ? parsed : {});
      } catch (error) {
        log.error(`data/${file}.json is not valid JSON`, error);
        this.data.set(file, {});
      }
    }
    onServerEvent(
      ADMIN.worldEvent(this.resource),
      { args: ([file, key, value]) => (typeof file === "string" ? [file, typeof key === "string" && key !== "" ? key : undefined, value] : null) },
      (file, key, value) => this.put(file, key, value),
    );
    this.ready = triggerServerCallback(ADMIN.worldChangesCallback(this.resource)).then(
      (changes) => {
        if (!isRecord(changes)) return;
        for (const [file, records] of Object.entries(changes)) {
          if (!isRecord(records)) continue;
          for (const [key, value] of Object.entries(records)) this.put(file, key === "" ? undefined : key, value);
        }
      },
      (error: unknown) => log.error("loading the panel changes since start failed", error),
    );
  }

  /** The current content of a file: the settings object, or `{ key: record }`. Read only; parse what you use. */
  get(file: string): Data {
    return this.data.get(file) ?? {};
  }

  onChange(file: string, handler: ChangeHandler): void {
    this.handlers.set(file, [...(this.handlers.get(file) ?? []), handler]);
  }

  private put(file: string, key: string | undefined, value: unknown): void {
    const data = this.data.get(file);
    if (!data) return;
    if (key === undefined) {
      if (isRecord(value)) this.data.set(file, value);
    } else if (value === null) delete data[key];
    else data[key] = value;
    for (const handler of this.handlers.get(file) ?? []) handler(key, value);
  }
}
