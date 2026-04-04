import { describe, it, expect, vi } from 'vitest';
import { getParentExperiment } from './parent.js';

describe('experiments/parent', () => {
  const mockClient = {
    getParentExperiment: vi.fn(),
  };

  it('should get parent experiment', async () => {
    const parent = { id: 5, name: 'parent-exp' };
    mockClient.getParentExperiment.mockResolvedValue(parent);
    const result = await getParentExperiment(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.getParentExperiment).toHaveBeenCalledWith(10);
    expect(result.data).toEqual(parent);
  });
});
