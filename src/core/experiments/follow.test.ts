import { describe, it, expect, vi } from 'vitest';
import { followExperiment, unfollowExperiment } from './follow.js';

describe('experiments/follow', () => {
  const mockClient = {
    followExperiment: vi.fn(),
    unfollowExperiment: vi.fn(),
  };

  it('should follow experiment', async () => {
    mockClient.followExperiment.mockResolvedValue(undefined);
    const result = await followExperiment(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.followExperiment).toHaveBeenCalledWith(10);
    expect(result.data).toEqual({ experimentId: 10 });
  });

  it('should unfollow experiment', async () => {
    mockClient.unfollowExperiment.mockResolvedValue(undefined);
    const result = await unfollowExperiment(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.unfollowExperiment).toHaveBeenCalledWith(10);
    expect(result.data).toEqual({ experimentId: 10 });
  });
});
