import { describe, it, expect } from 'vitest';
import { resolveByName } from './resolver.js';

const items = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
  { id: 3, name: 'alpha' },
];

describe('resolveByName', () => {
  it('should resolve by numeric ID', () => {
    expect(resolveByName(items, '2', 'Item')).toEqual({ id: 2, name: 'Beta' });
  });

  it('should resolve by name (case-insensitive)', () => {
    expect(resolveByName(items, 'Beta', 'Item')).toEqual({ id: 2, name: 'Beta' });
    expect(resolveByName(items, 'beta', 'Item')).toEqual({ id: 2, name: 'Beta' });
  });

  it('should throw on ambiguous name match', () => {
    expect(() => resolveByName(items, 'alpha', 'Item')).toThrow(/Multiple Item entries match/);
  });

  it('should throw on ID not found', () => {
    expect(() => resolveByName(items, '999', 'Item')).toThrow(/Item with ID 999 not found/);
  });

  it('should throw on name not found', () => {
    expect(() => resolveByName(items, 'Gamma', 'Item')).toThrow(/Item "Gamma" not found/);
  });

  it('should trim input', () => {
    expect(resolveByName(items, '  2  ', 'Item')).toEqual({ id: 2, name: 'Beta' });
    expect(resolveByName(items, '  Beta  ', 'Item')).toEqual({ id: 2, name: 'Beta' });
  });
});
