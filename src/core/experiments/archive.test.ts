import { describe, it, expect, vi } from 'vitest';
import { archiveExperiment } from './archive.js';

describe('experiments/archive', () => {
  const mockClient = {
    archiveExperiment: vi.fn(),
  };

  it('should archive experiment', async () => {
    mockClient.archiveExperiment.mockResolvedValue(undefined);
    const result = await archiveExperiment(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.archiveExperiment).toHaveBeenCalledWith(10, undefined, undefined);
    expect(result.data).toEqual({ id: 10, action: 'archived' });
  });

  it('should unarchive experiment', async () => {
    mockClient.archiveExperiment.mockResolvedValue(undefined);
    const result = await archiveExperiment(mockClient as any, {
      experimentId: 10 as any,
      unarchive: true,
    });
    expect(mockClient.archiveExperiment).toHaveBeenCalledWith(10, true, undefined);
    expect(result.data).toEqual({ id: 10, action: 'unarchived' });
  });

  it('should archive experiment with note', async () => {
    mockClient.archiveExperiment.mockResolvedValue(undefined);
    const result = await archiveExperiment(mockClient as any, {
      experimentId: 10 as any,
      note: 'cleaning up',
    });
    expect(mockClient.archiveExperiment).toHaveBeenCalledWith(10, undefined, 'cleaning up');
    expect(result.data).toEqual({ id: 10, action: 'archived' });
  });
});
