import { describe, it, expect, vi } from 'vitest';
import { fullOnExperiment } from './full-on.js';

describe('experiments/full-on', () => {
  const mockClient = {
    fullOnExperiment: vi.fn(),
  };

  it('should set experiment to full-on', async () => {
    mockClient.fullOnExperiment.mockResolvedValue(undefined);
    const result = await fullOnExperiment(mockClient as any, {
      experimentId: 10 as any,
      variant: 1,
    });
    expect(mockClient.fullOnExperiment).toHaveBeenCalledWith(10, 1, undefined);
    expect(result.data).toEqual({ id: 10, variant: 1 });
  });

  it('should set experiment to full-on with note', async () => {
    mockClient.fullOnExperiment.mockResolvedValue(undefined);
    const result = await fullOnExperiment(mockClient as any, {
      experimentId: 10 as any,
      variant: 2,
      note: 'winner found',
    });
    expect(mockClient.fullOnExperiment).toHaveBeenCalledWith(10, 2, 'winner found');
    expect(result.data).toEqual({ id: 10, variant: 2 });
  });
});
