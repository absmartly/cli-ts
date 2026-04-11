import { describe, it, expect, vi } from 'vitest';
import { searchExperiments } from './search.js';

describe('experiments/search', () => {
  const mockClient = {
    searchExperiments: vi.fn(),
  };

  it('should search experiments', async () => {
    const experiments = [{ id: 1, name: 'test-exp' }];
    mockClient.searchExperiments.mockResolvedValue(experiments);
    const result = await searchExperiments(mockClient as any, { query: 'test', limit: 10 });
    expect(mockClient.searchExperiments).toHaveBeenCalledWith('test', 10);
    expect(result.data).toEqual(experiments);
  });

  it('should return empty results', async () => {
    mockClient.searchExperiments.mockResolvedValue([]);
    const result = await searchExperiments(mockClient as any, { query: 'nonexistent', limit: 5 });
    expect(mockClient.searchExperiments).toHaveBeenCalledWith('nonexistent', 5);
    expect(result.data).toEqual([]);
  });
});
