import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateScheduleParams, createScheduledAction, deleteScheduledAction, VALID_SCHEDULE_ACTIONS } from './schedule.js';
import type { ExperimentId, ScheduledActionId } from '../../lib/api/branded-types.js';

const id = (n: number) => n as ExperimentId;
const actionId = (n: number) => n as ScheduledActionId;

describe('schedule', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockClient = {
      createScheduledAction: vi.fn().mockResolvedValue({ id: 99 }),
      deleteScheduledAction: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('validateScheduleParams', () => {
    // Use a far-future date to avoid "must be in the future" errors
    const futureDate = '2099-12-31T23:59:59Z';

    it('throws for invalid action', () => {
      expect(() =>
        validateScheduleParams({ experimentId: id(1), action: 'invalid', at: futureDate }),
      ).toThrow('Invalid action: "invalid"');
    });

    it('accepts all valid actions', () => {
      for (const action of VALID_SCHEDULE_ACTIONS) {
        expect(() =>
          validateScheduleParams({ experimentId: id(1), action, at: futureDate }),
        ).not.toThrow();
      }
    });

    it('throws when timezone is missing', () => {
      expect(() =>
        validateScheduleParams({ experimentId: id(1), action: 'start', at: '2099-12-31T10:00:00' }),
      ).toThrow('Missing timezone');
    });

    it('accepts timezone offset format', () => {
      expect(() =>
        validateScheduleParams({ experimentId: id(1), action: 'start', at: '2099-12-31T10:00:00+02:00' }),
      ).not.toThrow();
    });

    it('throws for invalid datetime', () => {
      expect(() =>
        validateScheduleParams({ experimentId: id(1), action: 'start', at: 'not-a-dateZ' }),
      ).toThrow('Invalid datetime');
    });

    it('throws when scheduled time is in the past', () => {
      expect(() =>
        validateScheduleParams({ experimentId: id(1), action: 'start', at: '2020-01-01T00:00:00Z' }),
      ).toThrow('must be in the future');
    });
  });

  describe('createScheduledAction', () => {
    it('creates action and returns result', async () => {
      const result = await createScheduledAction(mockClient as any, {
        experimentId: id(5),
        action: 'start',
        at: '2099-06-01T10:00:00Z',
        note: 'schedule it',
      });
      expect(mockClient.createScheduledAction).toHaveBeenCalledWith(
        id(5), 'start', '2099-06-01T10:00:00.000Z', 'schedule it', undefined,
      );
      expect(result.data.experimentId).toBe(id(5));
      expect(result.data.actionId).toBe(99);
    });

    it('uses default note when none provided', async () => {
      await createScheduledAction(mockClient as any, {
        experimentId: id(1),
        action: 'stop',
        at: '2099-01-01T00:00:00Z',
      });
      expect(mockClient.createScheduledAction).toHaveBeenCalledWith(
        id(1), 'stop', expect.any(String), 'Scheduled via CLI', undefined,
      );
    });

    it('passes reason when provided', async () => {
      await createScheduledAction(mockClient as any, {
        experimentId: id(1),
        action: 'stop',
        at: '2099-01-01T00:00:00Z',
        reason: 'testing',
      });
      expect(mockClient.createScheduledAction).toHaveBeenCalledWith(
        id(1), 'stop', expect.any(String), 'Scheduled via CLI', 'testing',
      );
    });
  });

  describe('deleteScheduledAction', () => {
    it('deletes and returns ids', async () => {
      const result = await deleteScheduledAction(mockClient as any, {
        experimentId: id(3),
        actionId: actionId(77),
      });
      expect(mockClient.deleteScheduledAction).toHaveBeenCalledWith(id(3), actionId(77));
      expect(result.data).toEqual({ experimentId: id(3), actionId: actionId(77) });
    });
  });
});
