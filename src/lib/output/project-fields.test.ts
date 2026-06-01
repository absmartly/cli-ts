import { describe, it, expect } from 'vitest';
import { projectFields } from './project-fields.js';

describe('projectFields', () => {
  it('returns data unchanged when no exclude/show-only given', () => {
    const data = [{ a: 1, b: 2 }];
    expect(projectFields(data, {})).toBe(data);
    expect(projectFields(data, { exclude: [] })).toBe(data);
    expect(projectFields(data, { showOnly: [] })).toBe(data);
  });

  describe('array of objects', () => {
    const rows = [
      { id: 1, name: 'a', secret: 'x' },
      { id: 2, name: 'b', secret: 'y' },
    ];

    it('excludes fields from every row', () => {
      expect(projectFields(rows, { exclude: ['secret'] })).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]);
    });

    it('keeps only requested fields, in requested order', () => {
      expect(projectFields(rows, { showOnly: ['name', 'id'] })).toEqual([
        { name: 'a', id: 1 },
        { name: 'b', id: 2 },
      ]);
    });

    it('ignores show-only fields that are absent', () => {
      expect(projectFields(rows, { showOnly: ['name', 'missing'] })).toEqual([
        { name: 'a' },
        { name: 'b' },
      ]);
    });

    it('leaves non-object array elements untouched', () => {
      expect(projectFields(['a', 'b'], { exclude: ['x'] })).toEqual(['a', 'b']);
    });
  });

  describe('single object', () => {
    it('excludes fields', () => {
      expect(projectFields({ id: 1, name: 'a', secret: 'x' }, { exclude: ['secret'] })).toEqual({
        id: 1,
        name: 'a',
      });
    });

    it('keeps only requested fields', () => {
      expect(projectFields({ id: 1, name: 'a', secret: 'x' }, { showOnly: ['id'] })).toEqual({
        id: 1,
      });
    });
  });

  describe('columnar { columnNames, rows }', () => {
    const columnar = {
      columnNames: ['key', 'value_type', 'last_event_at'],
      columnTypes: ['String', 'String', 'Int64'],
      rows: [
        ['currency', 'string', 1],
        ['items', 'array', 2],
      ],
    };

    it('excludes a column and its values + type', () => {
      expect(projectFields(columnar, { exclude: ['value_type'] })).toEqual({
        columnNames: ['key', 'last_event_at'],
        columnTypes: ['String', 'Int64'],
        rows: [
          ['currency', 1],
          ['items', 2],
        ],
      });
    });

    it('keeps only requested columns, in requested order', () => {
      expect(projectFields(columnar, { showOnly: ['last_event_at', 'key'] })).toEqual({
        columnNames: ['last_event_at', 'key'],
        columnTypes: ['Int64', 'String'],
        rows: [
          [1, 'currency'],
          [2, 'items'],
        ],
      });
    });

    it('works without columnTypes', () => {
      expect(
        projectFields({ columnNames: ['a', 'b'], rows: [[1, 2]] }, { exclude: ['a'] })
      ).toEqual({ columnNames: ['b'], rows: [[2]] });
    });
  });

  it('is idempotent: re-projecting already-projected data is a no-op', () => {
    const once = projectFields([{ id: 1, name: 'a', secret: 'x' }], { exclude: ['secret'] });
    const twice = projectFields(once, { exclude: ['secret'] });
    expect(twice).toEqual(once);
  });

  it('leaves primitives untouched', () => {
    expect(projectFields('hello', { exclude: ['x'] })).toBe('hello');
    expect(projectFields(42, { showOnly: ['x'] })).toBe(42);
    expect(projectFields(null, { exclude: ['x'] })).toBe(null);
  });
});
