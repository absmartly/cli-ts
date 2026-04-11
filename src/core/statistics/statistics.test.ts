import { describe, it, expect, vi } from 'vitest';
import { getPowerMatrix } from './statistics.js';

describe('statistics', () => {
  const mockClient = {
    getPowerAnalysisMatrix: vi.fn(),
  };

  it('should get power matrix', async () => {
    const config = { effect_sizes: [0.01], sample_sizes: [1000] };
    const matrixData = { matrix: [[0.8]] };
    mockClient.getPowerAnalysisMatrix.mockResolvedValue(matrixData);
    const result = await getPowerMatrix(mockClient as any, { config });
    expect(mockClient.getPowerAnalysisMatrix).toHaveBeenCalledWith(config);
    expect(result.data).toEqual(matrixData);
  });
});
