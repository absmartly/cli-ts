import { describe, it, expect, vi } from 'vitest';
import { diffExperimentsCore } from './diff.js';

vi.mock('../../api-client/experiment-summary.js', () => ({
  summarizeExperiment: (exp: Record<string, unknown>) => exp,
}));

vi.mock('../../api-client/experiment-diff.js', () => ({
  diffExperiments: (left: Record<string, unknown>, right: Record<string, unknown>) => {
    const diffs: Array<{ field: string; left: unknown; right: unknown }> = [];
    const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of allKeys) {
      if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) {
        diffs.push({ field: key, left: left[key], right: right[key] });
      }
    }
    return diffs;
  },
}));

describe('experiments/diff', () => {
  const mockClient = {
    getExperiment: vi.fn(),
    listExperiments: vi.fn(),
  };

  it('should diff two experiments by id', async () => {
    mockClient.getExperiment
      .mockResolvedValueOnce({ name: 'exp1', status: 'running' })
      .mockResolvedValueOnce({ name: 'exp2', status: 'stopped' });
    const result = await diffExperimentsCore(mockClient as any, {
      experimentId1: 1 as any,
      experimentId2: 2 as any,
    });
    expect(mockClient.getExperiment).toHaveBeenCalledWith(1);
    expect(mockClient.getExperiment).toHaveBeenCalledWith(2);
    expect(result.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'status' }),
      ])
    );
  });

  it('should diff experiment with iteration', async () => {
    mockClient.getExperiment.mockResolvedValueOnce({ name: 'exp1', status: 'running' });
    mockClient.listExperiments.mockResolvedValueOnce([
      { iteration: 1, name: 'exp1-iter1', status: 'stopped' },
      { iteration: 2, name: 'exp1-iter2', status: 'running' },
    ]);
    const result = await diffExperimentsCore(mockClient as any, {
      experimentId1: 1 as any,
      iteration: 2,
    });
    expect(mockClient.listExperiments).toHaveBeenCalledWith({ iterations_of: 1 });
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('should throw if iteration not found', async () => {
    mockClient.getExperiment.mockResolvedValueOnce({ name: 'exp1' });
    mockClient.listExperiments.mockResolvedValueOnce([{ iteration: 1 }]);
    await expect(
      diffExperimentsCore(mockClient as any, { experimentId1: 1 as any, iteration: 99 })
    ).rejects.toThrow('Iteration 99 not found');
  });

  it('should throw if no second experiment or iteration', async () => {
    mockClient.getExperiment.mockResolvedValueOnce({ name: 'exp1' });
    await expect(
      diffExperimentsCore(mockClient as any, { experimentId1: 1 as any })
    ).rejects.toThrow('Provide a second experiment ID or use --iteration <n>');
  });

  it('should stringify object diff values', async () => {
    mockClient.getExperiment
      .mockResolvedValueOnce({ config: { a: 1 } })
      .mockResolvedValueOnce({ config: { a: 2 } });
    const result = await diffExperimentsCore(mockClient as any, {
      experimentId1: 1 as any,
      experimentId2: 2 as any,
    });
    const configDiff = result.data.find((d) => d.field === 'config');
    expect(configDiff?.left).toBe('{"a":1}');
    expect(configDiff?.right).toBe('{"a":2}');
  });
});
