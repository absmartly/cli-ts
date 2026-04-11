import { describe, it, expect, vi } from 'vitest';
import { listRecommendedActions, dismissRecommendedAction } from './recommendations.js';

describe('experiments/recommendations', () => {
  const mockClient = {
    listRecommendedActions: vi.fn(),
    dismissRecommendedAction: vi.fn(),
  };

  it('should list recommended actions', async () => {
    const actions = [{ id: 1, action: 'stop' }];
    mockClient.listRecommendedActions.mockResolvedValue(actions);
    const result = await listRecommendedActions(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.listRecommendedActions).toHaveBeenCalledWith(10);
    expect(result.data).toEqual(actions);
  });

  it('should dismiss recommended action', async () => {
    mockClient.dismissRecommendedAction.mockResolvedValue(undefined);
    const result = await dismissRecommendedAction(mockClient as any, { actionId: 7 as any });
    expect(mockClient.dismissRecommendedAction).toHaveBeenCalledWith(7);
    expect(result.data).toEqual({ actionId: 7 });
  });
});
