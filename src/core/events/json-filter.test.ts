import { describe, it, expect } from 'vitest';
import { filterColumnarRows, hasColumnarFilters } from './json-filter.js';

// Mimics the json-layouts response shape (key/value_type/last_event_at).
const layouts = () => ({
  columnNames: ['key', 'value_type', 'last_event_at'],
  columnTypes: ['String', 'String', 'Int64'],
  rows: [
    ['currency', 'string', 1],
    ['items', 'array', 2],
    ['items/0', 'object', 3],
    ['items/0/segment_flight_number', 'string', 4],
    ['pageName', 'string', 5],
  ] as unknown[][],
});

// Mimics the json-values response shape (value/last_event_at).
const values = () => ({
  columnNames: ['value', 'last_event_at'],
  columnTypes: ['String', 'Int64'],
  rows: [
    ['LA3027 / LA3528 / LA8072', 1],
    ['LA8186', 2],
    ['DL2702 / LA8185', 3],
    ['', 4],
  ] as unknown[][],
});

const keys = (d: { rows: unknown[][] }) => d.rows.map((r) => r[0]);

describe('hasColumnarFilters', () => {
  it('is false when no filter option is set', () => {
    expect(hasColumnarFilters({})).toBe(false);
  });
  it('is true when any filter option is set', () => {
    expect(hasColumnarFilters({ match: 'x' })).toBe(true);
    expect(hasColumnarFilters({ topLevel: true })).toBe(true);
    expect(hasColumnarFilters({ maxDepth: 2 })).toBe(true);
  });
});

describe('filterColumnarRows - match (regex, case-insensitive)', () => {
  it('filters the key column by case-insensitive regex', () => {
    const out = filterColumnarRows(layouts(), 'key', { match: 'PAGE' }) as ReturnType<
      typeof layouts
    >;
    expect(keys(out)).toEqual(['pageName']);
  });
  it('supports regex alternation', () => {
    const out = filterColumnarRows(layouts(), 'key', {
      match: 'segment_flight|currency',
    }) as ReturnType<typeof layouts>;
    expect(keys(out)).toEqual(['currency', 'items/0/segment_flight_number']);
  });
  it('filters the value column for json-values', () => {
    const out = filterColumnarRows(values(), 'value', { match: 'LA8186|LA8153' }) as ReturnType<
      typeof values
    >;
    expect(out.rows.map((r) => r[0])).toEqual(['LA8186']);
  });
  it('throws a clear error on invalid regex', () => {
    expect(() => filterColumnarRows(layouts(), 'key', { match: '(' })).toThrow(
      /Invalid --match regex/
    );
  });
});

describe('filterColumnarRows - depth', () => {
  it('--top-level keeps only paths with no slash', () => {
    const out = filterColumnarRows(layouts(), 'key', { topLevel: true }) as ReturnType<
      typeof layouts
    >;
    expect(keys(out)).toEqual(['currency', 'items', 'pageName']);
  });
  it('--max-depth N keeps paths with at most N segments', () => {
    const out = filterColumnarRows(layouts(), 'key', { maxDepth: 2 }) as ReturnType<typeof layouts>;
    expect(keys(out)).toEqual(['currency', 'items', 'items/0', 'pageName']);
  });
  it('topLevel takes precedence over maxDepth', () => {
    const out = filterColumnarRows(layouts(), 'key', { topLevel: true, maxDepth: 3 }) as ReturnType<
      typeof layouts
    >;
    expect(keys(out)).toEqual(['currency', 'items', 'pageName']);
  });
  it('throws on a non-positive / non-integer max-depth', () => {
    expect(() => filterColumnarRows(layouts(), 'key', { maxDepth: 0 })).toThrow(/max-depth/);
    expect(() => filterColumnarRows(layouts(), 'key', { maxDepth: 1.5 })).toThrow(/max-depth/);
  });
});

describe('filterColumnarRows - composition & defensive behavior', () => {
  it('composes match AND depth', () => {
    const out = filterColumnarRows(layouts(), 'key', { match: 'items', maxDepth: 2 }) as ReturnType<
      typeof layouts
    >;
    expect(keys(out)).toEqual(['items', 'items/0']);
  });
  it('returns the data unchanged when no filters are active', () => {
    const d = layouts();
    expect(filterColumnarRows(d, 'key', {})).toBe(d);
  });
  it('returns data unchanged when the column is absent', () => {
    const d = layouts();
    expect(filterColumnarRows(d, 'nope', { match: 'x' })).toBe(d);
  });
  it('returns data unchanged for non-columnar shapes', () => {
    const weird = { foo: 'bar' };
    expect(filterColumnarRows(weird, 'key', { match: 'x' })).toBe(weird);
  });
  it('does not mutate the input rows', () => {
    const d = layouts();
    const before = d.rows.length;
    filterColumnarRows(d, 'key', { topLevel: true });
    expect(d.rows.length).toBe(before);
  });
});
