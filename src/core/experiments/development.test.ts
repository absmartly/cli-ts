import { describe, it, expect, vi } from 'vitest';
import { developmentExperiment } from './development.js';

describe('experiments/development', () => {
  const mockClient = {
    developmentExperiment: vi.fn(),
  };

  it('should put experiment in development mode', async () => {
    mockClient.developmentExperiment.mockResolvedValue(undefined);
    const result = await developmentExperiment(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.developmentExperiment).toHaveBeenCalledWith(10, undefined);
    expect(result.data).toEqual({ id: 10 });
  });

  it('should put experiment in development mode with note', async () => {
    mockClient.developmentExperiment.mockResolvedValue(undefined);
    const result = await developmentExperiment(mockClient as any, {
      experimentId: 10 as any,
      note: 'testing',
    });
    expect(mockClient.developmentExperiment).toHaveBeenCalledWith(10, 'testing');
    expect(result.data).toEqual({ id: 10 });
  });
});
