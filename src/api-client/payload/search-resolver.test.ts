import { describe, it, expect, vi } from 'vitest';
import { resolveBySearch } from './search-resolver.js';

describe('resolveBySearch', () => {
  it('deduplicates results by id', async () => {
    const searchFn = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
      .mockResolvedValueOnce([{ id: 2, name: 'B' }, { id: 3, name: 'C' }]);

    const result = await resolveBySearch(['foo', 'bar'], searchFn);

    expect(result).toEqual([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 'C' },
    ]);
  });

  it('skips numeric IDs and does not search for them', async () => {
    const searchFn = vi.fn().mockResolvedValue([{ id: 10, name: 'X' }]);

    const result = await resolveBySearch(['42', 'abc'], searchFn);

    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(searchFn.mock.calls[0]![0]).toBe('abc');
    expect(result).toEqual([{ id: 10, name: 'X' }]);
  });

  it('extracts email from angle brackets for search', async () => {
    const searchFn = vi.fn().mockResolvedValue([{ id: 1, name: 'User' }]);

    await resolveBySearch(['John <john@example.com>'], searchFn);

    expect(searchFn.mock.calls[0]![0]).toBe('john@example.com');
  });

  it('returns results from multiple batches', async () => {
    const searchFn = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'A' }])
      .mockResolvedValueOnce([{ id: 2, name: 'B' }]);

    const result = await resolveBySearch(['alpha', 'beta'], searchFn);

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe(1);
    expect(result[1]!.id).toBe(2);
  });

  it('returns empty array for empty queries', async () => {
    const searchFn = vi.fn();

    const result = await resolveBySearch([], searchFn);

    expect(result).toEqual([]);
    expect(searchFn).not.toHaveBeenCalled();
  });
});
