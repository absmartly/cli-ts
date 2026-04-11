import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateTasks, requestUpdate, VALID_TASKS } from './request-update.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';

const id = (n: number) => n as ExperimentId;

describe('request-update', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockClient = {
      requestExperimentUpdate: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('validateTasks', () => {
    it('accepts all valid tasks', () => {
      expect(() => validateTasks([...VALID_TASKS])).not.toThrow();
    });

    it('throws for invalid task', () => {
      expect(() => validateTasks(['invalid_task'])).toThrow('Invalid task: "invalid_task"');
    });

    it('throws listing valid tasks', () => {
      expect(() => validateTasks(['bad'])).toThrow('Valid tasks:');
    });

    it('accepts empty array', () => {
      expect(() => validateTasks([])).not.toThrow();
    });

    it('throws on first invalid in mixed array', () => {
      expect(() => validateTasks(['preview_metrics', 'bad_task'])).toThrow(
        'Invalid task: "bad_task"'
      );
    });
  });

  describe('requestUpdate', () => {
    it('calls client without params when no tasks or replaceGsa', async () => {
      const result = await requestUpdate(mockClient as any, { experimentId: id(1) });
      expect(mockClient.requestExperimentUpdate).toHaveBeenCalledWith(id(1), undefined);
      expect(result.data).toEqual({ experimentId: id(1) });
    });

    it('passes tasks to client', async () => {
      await requestUpdate(mockClient as any, {
        experimentId: id(1),
        tasks: ['preview_metrics'],
      });
      expect(mockClient.requestExperimentUpdate).toHaveBeenCalledWith(
        id(1),
        expect.objectContaining({ tasks: ['preview_metrics'] })
      );
    });

    it('passes replaceGroupSequentialAnalysis flag', async () => {
      await requestUpdate(mockClient as any, {
        experimentId: id(1),
        replaceGsa: true,
      });
      expect(mockClient.requestExperimentUpdate).toHaveBeenCalledWith(
        id(1),
        expect.objectContaining({ replaceGroupSequentialAnalysis: true })
      );
    });

    it('validates tasks before calling client', async () => {
      await expect(
        requestUpdate(mockClient as any, {
          experimentId: id(1),
          tasks: ['invalid'],
        })
      ).rejects.toThrow('Invalid task');
      expect(mockClient.requestExperimentUpdate).not.toHaveBeenCalled();
    });
  });
});
