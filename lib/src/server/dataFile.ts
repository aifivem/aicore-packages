import { copyFile, mkdir, rename, writeFile } from "node:fs/promises";
import type { Logger } from "../shared";

/** Bursts of admin edits are written once they settle. */
const WRITE_DELAY_MS = 250;

/**
 * Admin-edited content of a resource in `data/<name>.json` (content goes with git; player data stays in the DB).
 * The server is the only reader and writer: it reads the file once at start and keeps the truth in memory.
 * A write goes to a temp file that then replaces the real one (a crash never leaves half a file), the previous
 * file is kept as `.bak`, and a broken file falls back to it at start.
 */
export class DataFile {
  private writes: Promise<void> = Promise.resolve();
  private pending: unknown = undefined;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly resource: string,
    private readonly name: string,
    private readonly log: Logger,
  ) {}

  /** The parsed file (or its backup when it is broken); null when neither exists. */
  read(): unknown {
    for (const path of [this.path, `${this.path}.bak`]) {
      const raw = LoadResourceFile(this.resource, path);
      if (!raw) continue;
      try {
        return JSON.parse(raw) as unknown;
      } catch (error) {
        this.log.error(
          `${this.resource}/${path} is not valid JSON${path === this.path ? ", trying the backup" : ""}`,
          error,
        );
      }
    }
    return null;
  }

  /** Stores `value` (the latest call wins); written shortly after, in order with earlier writes. */
  write(value: unknown): void {
    this.pending = value;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const text = `${JSON.stringify(this.pending, null, 2)}\n`;
      this.writes = this.writes
        .then(() => this.flush(text))
        .catch((error: unknown) =>
          this.log.error(`saving ${this.resource}/${this.path} failed`, error),
        );
    }, WRITE_DELAY_MS);
  }

  private get path(): string {
    return `data/${this.name}.json`;
  }

  private async flush(text: string): Promise<void> {
    const file = `${GetResourcePath(this.resource)}/${this.path}`;
    await mkdir(file.slice(0, file.lastIndexOf("/")), { recursive: true });
    await writeFile(`${file}.tmp`, text, "utf8");
    await copyFile(file, `${file}.bak`).catch(() => undefined);
    await rename(`${file}.tmp`, file);
  }
}
