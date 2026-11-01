import type { LookupSource } from "./lookups";

/** Data model of one value (server validation). Every spec may be `optional` (absent allowed). */
export type DataSpec =
  | {
      type: "text";
      min?: number;
      max?: number;
      pattern?: string;
      lookup?: LookupSource;
      /** The key of a record in another `records` file of the same panel ("" allowed: none). */
      records?: string;
      optional?: boolean;
    }
  | {
      type: "number";
      min?: number;
      max?: number;
      integer?: boolean;
      optional?: boolean;
    }
  | { type: "bool"; optional?: boolean }
  | { type: "enum"; values: Array<string | number>; optional?: boolean }
  | {
      type: "names";
      max?: number;
      itemMax?: number;
      pattern?: string;
      lookup?: LookupSource;
      optional?: boolean;
    }
  | { type: "vec3"; optional?: boolean }
  | { type: "vec4"; optional?: boolean }
  | { type: "object"; fields: Record<string, DataSpec>; optional?: boolean }
  | {
      type: "list";
      of: DataSpec;
      min?: number;
      max?: number;
      optional?: boolean;
    };

/**
 * A data file: `settings` is one object (its top-level keys are the sections), `records` is `{ key: record }`.
 * `sync: "all"` files are in the resource's `files` and every client mirrors them; `"admin"` files stay on the server.
 */
export interface FileSpec {
  kind: "settings" | "records";
  sync: "all" | "admin";
  sections: Record<string, DataSpec>;
  /** records: allowed keys (default lowercase letters, digits, underscores, 2-32 long). */
  keyPattern?: string;
  /** records: section holding the name shown in lists and dialogs. */
  labelPath?: string;
  /** records: the new record a create starts from (the typed name goes to `labelPath`). */
  newRecord?: Record<string, unknown>;
  /** records: keys that can never be deleted (e.g. the unemployed job). */
  locked?: string[];
  /** settings: sections a file is missing are filled from here at load (a setting added in an update). */
  defaults?: Record<string, unknown>;
  /** Runtime state the script fills with `commit` (a live list the panel shows): never read from or saved to disk, never edited in the panel. */
  memory?: boolean;
}
