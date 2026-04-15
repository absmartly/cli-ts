import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listActivity, fetchAllActivity } from './activity.js';

describe('activity', () => {
  const mockClient = {
    listExperiments: vi.fn(),
    listExperimentActivity: vi.fn(),
    listUsers: vi.fn(),
    listTeams: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAllActivity', () => {
    it('should fetch experiments and their notes, sorted by date descending', async () => {
      const exp1 = { id: 1, name: 'Exp1' };
      const exp2 = { id: 2, name: 'Exp2' };
      mockClient.listExperiments.mockResolvedValue([exp1, exp2]);
      mockClient.listExperimentActivity
        .mockResolvedValueOnce([
          { created_at: '2025-01-01T00:00:00Z', action: 'start', created_by: { first_name: 'A' } },
        ])
        .mockResolvedValueOnce([
          { created_at: '2025-01-02T00:00:00Z', action: 'stop', created_by: { first_name: 'B' } },
        ]);

      const result = await fetchAllActivity(mockClient as any, { items: 10 });

      expect(mockClient.listExperiments).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'updated_at', items: 10 })
      );
      expect(result).toHaveLength(2);
      // Most recent first
      expect(result[0].note.action).toBe('stop');
      expect(result[0].experiment.name).toBe('Exp2');
      expect(result[1].note.action).toBe('start');
      expect(result[1].experiment.name).toBe('Exp1');
    });

    it('should filter by since timestamp', async () => {
      const exp = { id: 1, name: 'Exp1' };
      mockClient.listExperiments.mockResolvedValue([exp]);
      mockClient.listExperimentActivity.mockResolvedValue([
        { created_at: '2025-01-01T00:00:00Z', action: 'old' },
        { created_at: '2025-06-01T00:00:00Z', action: 'new' },
      ]);

      const sinceMs = new Date('2025-03-01T00:00:00Z').getTime();
      const result = await fetchAllActivity(mockClient as any, { items: 20, since: sinceMs });

      expect(result).toHaveLength(1);
      expect(result[0].note.action).toBe('new');
    });

    it('should default to 20 items and updated_at sort', async () => {
      mockClient.listExperiments.mockResolvedValue([]);
      await fetchAllActivity(mockClient as any, {});
      expect(mockClient.listExperiments).toHaveBeenCalledWith(
        expect.objectContaining({ items: 20, sort: 'updated_at' })
      );
    });
  });

  describe('listActivity', () => {
    it('should return formatted activity entries with limit', async () => {
      const exp = { id: 1, name: 'TestExp' };
      mockClient.listExperiments.mockResolvedValue([exp]);
      mockClient.listExperimentActivity.mockResolvedValue([
        {
          created_at: '2025-01-01T00:00:00Z',
          action: 'created',
          created_by: { first_name: 'John', last_name: 'Doe' },
        },
        {
          created_at: '2025-01-02T00:00:00Z',
          action: 'started',
          created_by: { first_name: 'Jane' },
        },
        { created_at: '2025-01-03T00:00:00Z', action: 'stopped', created_by: null },
      ]);

      const result = await listActivity(mockClient as any, { limit: 2 });

      expect(result.data).toHaveLength(2);
      // Most recent first
      expect(result.data[0].action).toBe('stopped');
      expect(result.data[0].user).toBe('System');
      expect(result.data[1].action).toBe('started');
      expect(result.data[1].user).toBe('Jane');
      expect(result.warnings).toEqual(['Showing 2 of 3 entries. Use --limit to show more.']);
    });

    it('should not include warnings when all entries fit within limit', async () => {
      mockClient.listExperiments.mockResolvedValue([]);
      mockClient.listExperimentActivity.mockResolvedValue([]);

      const result = await listActivity(mockClient as any, {});

      expect(result.data).toEqual([]);
      expect(result.warnings).toBeUndefined();
    });

    it('should build lookups when includeNotes is true', async () => {
      mockClient.listExperiments.mockResolvedValue([]);
      mockClient.listUsers.mockResolvedValue([]);
      mockClient.listTeams.mockResolvedValue([]);

      await listActivity(mockClient as any, { includeNotes: true });

      expect(mockClient.listUsers).toHaveBeenCalledWith({ items: 500 });
      expect(mockClient.listTeams).toHaveBeenCalledWith({ items: 500 });
    });
  });
});
