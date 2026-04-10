import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stopExperiment, VALID_STOP_REASONS } from './stop.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

const id = (n: number) => n as ExperimentId;

describe('stop', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockClient = {
      stopExperiment: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('throws error for invalid reason listing valid reasons', async () => {
    await expect(
      stopExperiment(mockClient as any, {
        experimentId: id(1),
        reason: 'bad_reason' as any,
      })
    ).rejects.toThrow('Invalid reason: "bad_reason"');

    await expect(
      stopExperiment(mockClient as any, {
        experimentId: id(1),
        reason: 'bad_reason' as any,
      })
    ).rejects.toThrow('Valid reasons:');
  });

  it('stops experiment with valid reason', async () => {
    const result = await stopExperiment(mockClient as any, {
      experimentId: id(5),
      reason: 'testing',
      note: 'done',
    });
    expect(mockClient.stopExperiment).toHaveBeenCalledWith(id(5), 'testing', 'done');
    expect(result.data).toEqual({ id: id(5) });
  });

  it('accepts all valid stop reasons', async () => {
    for (const reason of VALID_STOP_REASONS) {
      mockClient.stopExperiment.mockResolvedValue(undefined);
      const result = await stopExperiment(mockClient as any, {
        experimentId: id(1),
        reason,
      });
      expect(result.data.id).toBe(id(1));
    }
  });

  it('stops experiment without note', async () => {
    const result = await stopExperiment(mockClient as any, {
      experimentId: id(3),
      reason: 'other',
    });
    expect(mockClient.stopExperiment).toHaveBeenCalledWith(id(3), 'other', undefined);
    expect(result.data).toEqual({ id: id(3) });
  });
});
