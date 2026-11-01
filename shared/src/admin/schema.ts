/**
 * Admin panel contract: every ai-* resource describes its panel content in one JSON-safe schema; ai-core hosts the
 * panel, the resource keeps, validates and saves its own `data/*.json` (the lib's `AdminPanel`).
 */

import type { FileSpec } from "./dataSpec";
import type { ValueLabels, WidgetSpec } from "./widgets";

/** A column of a read-only table tab: the value at `path` of each record. */
export interface TableColumn extends ValueLabels {
  path: string;
  /** Lang key of the header. */
  label: string;
  /** Relative width (default 1). */
  width?: number;
  mono?: boolean;
}

export interface TableSpec {
  columns: TableColumn[];
  /** Path the rows are sorted by (default the record key). */
  sort?: string;
}

export interface CardSpec {
  /** Font Awesome solid icon name without `fa-` (e.g. "briefcase"). */
  icon: string;
  title: string;
  desc?: string;
  fields: WidgetSpec[];
}

export interface TabSpec {
  id: string;
  file: string;
  icon: string;
  label: string;
  /** One sentence: what this tab sets up in the game. */
  desc: string;
  cards: CardSpec[];
  /** records: a second line in list rows (path of a value). */
  listSub?: string;
  /** records: lang keys of the create button and of the delete button (a short verb, also the dialog's action). */
  createLabel?: string;
  deleteLabel?: string;
  /** records: lang key of what deleting a record leaves behind, shown in the delete dialog (default: the generic text). */
  deleteDesc?: string;
  /** records: show the file as one read-only, searchable table (a row per record) instead of list + editor; `cards` stays empty. */
  table?: TableSpec;
}

export interface PanelSchema {
  /** Lang key of the script's name in the panel sidebar. */
  title: string;
  icon: string;
  files: Record<string, FileSpec>;
  tabs: TabSpec[];
}
