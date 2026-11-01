import type { LookupSource } from "./lookups";

/** Controls of the panel; `path` is dotted from the record (or the settings object), a write replaces its section. */
export type WidgetSpec = WidgetBase &
  (
    | {
        widget: "text";
        placeholder?: string;
        /** Pick from a lookup list (autocomplete; the data spec carries the same lookup). */
        lookup?: LookupSource;
        /** Pick a record of another `records` file of this panel by its label (the data spec carries the same `records`). */
        records?: string;
        /** Name suggestions (a button inside the box lists them): street and zone names at the point at `from` (a path in the same record), else at the admin. */
        suggest?: { from?: string };
      }
    | {
        widget: "number";
        min?: number;
        max?: number;
        step?: number;
        unit?: string;
      }
    | { widget: "switch" }
    | {
        widget: "select";
        options: Array<{ value: string | number; label: string }>;
      }
    | { widget: "tags"; placeholder?: string; lookup?: LookupSource }
    | {
        widget: "point";
        heading?: boolean;
        /** "camera": "Use my position" takes the game camera instead of the ped. */
        from?: "camera";
        /** The point is on the floor (teleported to with SetEntityCoords); without it the ped's own root height. */
        ground?: boolean;
      }
    | {
        widget: "list";
        /** Row controls: `text`, `number`, `switch`, `select`, `grade`, `point`; a row control's `showIf` path is read in its row. */
        rows: WidgetSpec[];
        newRow: Record<string, unknown>;
        addLabel: string;
        rowLabel?: string;
        max?: number;
        /** Fewest rows the remove button leaves (default 1). */
        min?: number;
        /** Long lists: a search box over the rows' values, newest rows first, 50 shown at a time. */
        search?: boolean;
        /** Rows with more controls than fit on one line wrap onto the next. */
        wrap?: boolean;
      }
    /**
     * A job or gang grade (data: the grade number): a select of the grade names of the job or gang named at `of` (a
     * path in the same record, or in the same row inside a `list`), from the `lookup` list.
     */
    | { widget: "grade"; of: string; lookup: "job" | "gang" }
    /**
     * A long read-only names list (data: `names`, thousands of entries): search and 50 shown at a time. With `addTo`,
     * each entry has a button that appends `newRow` with the entry at `field` to the list section at `path`
     * (`label`: lang key of the button, `doneLabel`: shown instead when a row there already has the entry).
     */
    | {
        widget: "browse";
        addTo?: {
          path: string;
          field: string;
          newRow: Record<string, unknown>;
          label: string;
          doneLabel: string;
        };
      }
    /** A map blip `{ sprite, color, scale }` (data: an object of three numbers): picture grid, colour swatches, size. */
    | { widget: "blip" }
    /** A game model name (data: text): a search over the game's models with pictures; a typed addon name is kept. */
    | {
        widget: "model";
        kind: "vehicle" | "ped" | "object";
        placeholder?: string;
      }
    /** A colour (data: text `#rrggbb`): swatch, hex box, preset colours. */
    | { widget: "color" }
    /** A world object picked with the free camera (data at `path`: vec3 of the object; its model name goes to `modelPath`). Doors, props. */
    | { widget: "entity"; modelPath: string }
    /** Read only: shows the value (state the script fills in, e.g. a default it reports). */
    | ({ widget: "info"; mono?: boolean } & ValueLabels)
    /**
     * A button that runs the script's `panel.onAction(path, (admin, record) => error | null)` on this record (or the
     * settings object); nothing is stored at `path`, it names the action. `button`: lang key of the button text;
     * `confirm`: lang key of a question asked first (destructive or costly actions); `danger`: red button.
     */
    | {
        widget: "action";
        button: string;
        icon?: string;
        confirm?: string;
        danger?: boolean;
      }
    /**
     * A ground polygon (data: a list of `{ x, y, z }` corners, data spec `{ type: "list", of: { type: "vec3" }, min: 3 }`):
     * corners added with the free camera or the admin's position, removed one by one; the shape is drawn in the world
     * while the field is on screen. `heightPath`: a number section of the same record drawn as the metres above and
     * below the corners.
     */
    | { widget: "zone"; heightPath?: string; max?: number }
  );

/** How a read-only value is shown: stored values with a lang key show that text; an empty value shows `empty`. */
export interface ValueLabels {
  /** Lang keys of stored values (a value without an entry shows as it is). */
  values?: Record<string, string>;
  /** Lang key shown for an empty value. */
  empty?: string;
}

interface WidgetBase {
  path: string;
  /** Lang key of the label. */
  label: string;
  /** Lang key of a one-sentence hint (unit, rule, what it does in game). */
  hint?: string;
  /** Shown only while the value at `path` (same record or settings section) is one of `values` (a door's second leaf for double doors). */
  showIf?: { path: string; values: Array<string | number | boolean> };
}
