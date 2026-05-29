// Client-side post-processing for the columnar results returned by
// `events json-layouts` and `events json-values`
// (shape: { columnNames, columnTypes, rows }). Filters the rows against one
// named column without changing the columnar shape, so output formatting and
// `-o json` are unaffected.

export interface ColumnarFilterOptions {
  /** Case-insensitive regex tested against the target column's stringified cell. */
  match?: string | undefined;
  /** Keep only depth-1 paths (no '/'). Equivalent to maxDepth = 1; takes precedence. */
  topLevel?: boolean | undefined;
  /** Keep only paths with at most this many '/'-separated segments. */
  maxDepth?: number | undefined;
}

interface Columnar {
  columnNames: string[];
  columnTypes?: string[];
  rows: unknown[][];
}

function isColumnar(data: unknown): data is Columnar {
  const d = data as Columnar | null;
  return !!d && Array.isArray(d.columnNames) && Array.isArray(d.rows);
}

export function hasColumnarFilters(opts: ColumnarFilterOptions): boolean {
  return opts.match !== undefined || opts.topLevel === true || opts.maxDepth !== undefined;
}

/**
 * Filter the `rows` of a columnar result by a named column.
 * - `match`: case-insensitive regex the column cell must match.
 * - `topLevel` / `maxDepth`: limit path depth (segments split on '/').
 * Filters compose with AND. Returns the input untouched when no filter is
 * active, the data is not columnar, or the column is absent.
 */
export function filterColumnarRows(
  data: unknown,
  column: string,
  opts: ColumnarFilterOptions
): unknown {
  if (!hasColumnarFilters(opts)) return data;

  // Validate inputs up front so bad flags fail fast regardless of data shape.
  let regex: RegExp | undefined;
  if (opts.match !== undefined) {
    try {
      regex = new RegExp(opts.match, 'i');
    } catch (e) {
      throw new Error(`Invalid --match regex: ${(e as Error).message}`);
    }
  }
  if (opts.maxDepth !== undefined && (!Number.isInteger(opts.maxDepth) || opts.maxDepth < 1)) {
    throw new Error('--max-depth must be a positive integer');
  }

  if (!isColumnar(data)) return data;
  const colIdx = data.columnNames.indexOf(column);
  if (colIdx === -1) return data;

  const depthLimit = opts.topLevel ? 1 : opts.maxDepth;

  const rows = data.rows.filter((row) => {
    const cell = String(row[colIdx] ?? '');
    if (regex && !regex.test(cell)) return false;
    if (depthLimit !== undefined && cell.split('/').length > depthLimit) return false;
    return true;
  });

  return { ...data, rows };
}
