import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startExperiment } from './start.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

const id = (n: number) => n as ExperimentId;

describe('start', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockClient = {
      getExperiment: vi.fn(),
      startExperiment: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('skips draft experiment (state=created) with warning', async () => {
    mockClient.getExperiment.mockResolvedValue({ state: 'created' });
    const result = await startExperiment(mockClient as any, { experimentId: id(10) });
    expect(result.data.skipped).toBe(true);
    expect(result.data.skipReason).toBe('draft state');
    expect(result.warnings).toEqual([`Experiment 10 is in draft state, skipping`]);
    expect(mockClient.startExperiment).not.toHaveBeenCalled();
  });

  it('starts experiment in non-draft state', async () => {
    mockClient.getExperiment.mockResolvedValue({ state: 'ready' });
    const result = await startExperiment(mockClient as any, { experimentId: id(5), note: 'go' });
    expect(mockClient.startExperiment).toHaveBeenCalledWith(id(5), 'go');
    expect(result.data).toEqual({ id: id(5) });
    expect(result.data.skipped).toBeUndefined();
  });

  it('starts experiment without note', async () => {
    mockClient.getExperiment.mockResolvedValue({ state: 'stopped' });
    const result = await startExperiment(mockClient as any, { experimentId: id(3) });
    expect(mockClient.startExperiment).toHaveBeenCalledWith(id(3), undefined);
    expect(result.data.id).toBe(id(3));
  });
});
