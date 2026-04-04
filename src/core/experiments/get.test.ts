import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getExperiment } from './get.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

vi.mock('../../api-client/experiment-summary.js', () => ({
  summarizeExperiment: vi.fn().mockReturnValue({ id: 1, name: 'Test', state: 'running' }),
}));

const id = (n: number) => n as ExperimentId;

describe('get', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      getExperiment: vi.fn().mockResolvedValue({ id: 1, name: 'Test', state: 'running', extra: 'data' }),
      listExperimentActivity: vi.fn().mockResolvedValue([{ note: 'started' }]),
    };
  });

  it('returns experiment and summary', async () => {
    const result = await getExperiment(mockClient as any, { experimentId: id(1) });
    expect(mockClient.getExperiment).toHaveBeenCalledWith(id(1));
    expect(result.data.experiment).toBeDefined();
    expect(result.data.summary).toBeDefined();
    expect(result.data.activity).toBeUndefined();
  });

  it('fetches activity when requested', async () => {
    const result = await getExperiment(mockClient as any, { experimentId: id(1), activity: true });
    expect(mockClient.listExperimentActivity).toHaveBeenCalledWith(id(1));
    expect(result.data.activity).toEqual([{ note: 'started' }]);
  });

  it('does not fetch activity when not requested', async () => {
    await getExperiment(mockClient as any, { experimentId: id(1) });
    expect(mockClient.listExperimentActivity).not.toHaveBeenCalled();
  });

  it('returns raw experiment in detail when raw=true', async () => {
    const result = await getExperiment(mockClient as any, { experimentId: id(1), raw: true });
    expect(result.detail).toEqual(expect.objectContaining({ id: 1, name: 'Test', extra: 'data' }));
  });

  it('returns raw experiment with activity when both raw and activity', async () => {
    const result = await getExperiment(mockClient as any, { experimentId: id(1), raw: true, activity: true });
    expect(result.detail).toEqual(expect.objectContaining({
      id: 1,
      activity: [{ note: 'started' }],
    }));
  });

  it('returns summary in detail when not raw', async () => {
    const result = await getExperiment(mockClient as any, { experimentId: id(1) });
    // detail is the summary (from mock)
    expect(result.detail).toEqual({ id: 1, name: 'Test', state: 'running' });
  });
});
