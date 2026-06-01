// Generic, output-layer column projection driven by the global --exclude and
// --show-only flags. Unlike applyShowExclude (which works at the entity-summary
// layer with access to the raw response), this operates on whatever data is
// about to be printed, so every command — including ones with no summarized
// view — honors --exclude/--show-only.
//
// It is intentionally key-based (exact top-level keys / column names) and
// idempotent: re-projecting data that was already projected at the summary
// layer is a no-op. --show is NOT handled here; adding fields requires the raw
// response and only makes sense at the summary layer.

interface Columnar {
  columnNames: string[];
  columnTypes?: unknown[];
  rows: unknown[][];
}

function isColumnar(data: unknown): data is Columnar {
  if (data === null || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.columnNames) && Array.isArray(d.rows);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function projectObject(
  obj: Record<string, unknown>,
  exclude: string[],
  showOnly: string[] | undefined
): Record<string, unknown> {
  if (showOnly && showOnly.length > 0) {
    const result: Record<string, unknown> = {};
    for (const field of showOnly) {
      if (field in obj) result[field] = obj[field];
    }
    return result;
  }
  if (exclude.length === 0) return obj;
  const result = { ...obj };
  for (const field of exclude) delete result[field];
  return result;
}

function projectColumnar(
  data: Columnar,
  exclude: string[],
  showOnly: string[] | undefined
): Columnar {
  let keep: number[];
  if (showOnly && showOnly.length > 0) {
    // Preserve the order the user requested.
    keep = showOnly.map((name) => data.columnNames.indexOf(name)).filter((i) => i >= 0);
  } else if (exclude.length > 0) {
    const drop = new Set(exclude);
    keep = data.columnNames.map((_, i) => i).filter((i) => !drop.has(data.columnNames[i]!));
  } else {
    return data;
  }

  const result: Columnar = {
    ...data,
    columnNames: keep.map((i) => data.columnNames[i]!),
    rows: data.rows.map((row) => keep.map((i) => row[i])),
  };
  if (Array.isArray(data.columnTypes)) {
    result.columnTypes = keep.map((i) => data.columnTypes![i]);
  }
  return result;
}

export interface ProjectFieldsOptions {
  exclude?: string[] | undefined;
  showOnly?: string[] | undefined;
}

export function projectFields(data: unknown, options: ProjectFieldsOptions): unknown {
  const exclude = options.exclude ?? [];
  const showOnly = options.showOnly;
  if (exclude.length === 0 && (!showOnly || showOnly.length === 0)) return data;

  if (isColumnar(data)) return projectColumnar(data, exclude, showOnly);

  if (Array.isArray(data)) {
    return data.map((item) =>
      isPlainObject(item) ? projectObject(item, exclude, showOnly) : item
    );
  }

  if (isPlainObject(data)) return projectObject(data, exclude, showOnly);

  return data;
}
