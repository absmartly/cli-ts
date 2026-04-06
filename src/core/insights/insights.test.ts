import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  toEpochSeconds,
  getVelocityInsights,
  getDecisionInsights,
} from './insights.js';

describe('insights', () => {
  const mockClient = {
    getVelocityInsights: vi.fn(),
    getDecisionInsights: vi.fn(),
    resolveUnitTypes: vi.fn(),
    resolveTeams: vi.fn(),
    resolveUsers: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toEpochSeconds', () => {
    it('should convert valid date string to epoch seconds', () => {
      const result = toEpochSeconds('2026-01-01T00:00:00Z');
      expect(result).toBe(Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000));
    });

    it('should convert date-only string to epoch seconds', () => {
      const result = toEpochSeconds('2025-06-15');
      expect(result).toBe(Math.floor(new Date('2025-06-15').getTime() / 1000));
    });

    it('should throw descriptive error for invalid date', () => {
      expect(() => toEpochSeconds('not-a-date')).toThrow(
        'Invalid date: "not-a-date". Expected a valid date string'
      );
    });

    it('should throw descriptive error for empty string', () => {
      expect(() => toEpochSeconds('')).toThrow('Invalid date: ""');
    });
  });

  describe('getVelocityInsights', () => {
    it('should call client with converted dates and numeric filters (no resolution needed)', async () => {
      mockClient.getVelocityInsights.mockResolvedValue({ velocity: [] });
      const result = await getVelocityInsights(mockClient as any, {
        from: '2025-01-01T00:00:00Z',
        to: '2025-02-01T00:00:00Z',
        aggregation: 'weekly',
        unitTypes: '1,2',
        teams: '10',
      });
      expect(mockClient.getVelocityInsights).toHaveBeenCalledWith({
        from: Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000),
        to: Math.floor(new Date('2025-02-01T00:00:00Z').getTime() / 1000),
        aggregation: 'weekly',
        unit_type_ids: [1, 2],
        team_ids: [10],
      });
      expect(result.data).toEqual({ velocity: [] });
    });

    it('should resolve names to IDs for non-numeric filters', async () => {
      mockClient.getVelocityInsights.mockResolvedValue({ velocity: [] });
      mockClient.resolveTeams.mockResolvedValue([{ id: 10, name: 'Product' }]);
      mockClient.resolveUnitTypes.mockResolvedValue([{ id: 1, name: 'user_id' }]);
      await getVelocityInsights(mockClient as any, {
        from: '2025-01-01T00:00:00Z',
        to: '2025-02-01T00:00:00Z',
        aggregation: 'weekly',
        unitTypes: 'user_id',
        teams: 'Product',
      });
      expect(mockClient.resolveTeams).toHaveBeenCalledWith(['Product']);
      expect(mockClient.resolveUnitTypes).toHaveBeenCalledWith(['user_id']);
      expect(mockClient.getVelocityInsights).toHaveBeenCalledWith({
        from: Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000),
        to: Math.floor(new Date('2025-02-01T00:00:00Z').getTime() / 1000),
        aggregation: 'weekly',
        unit_type_ids: [1],
        team_ids: [10],
      });
    });

    it('should omit optional filters when not provided', async () => {
      mockClient.getVelocityInsights.mockResolvedValue({});
      await getVelocityInsights(mockClient as any, {
        from: '2025-01-01T00:00:00Z',
        to: '2025-02-01T00:00:00Z',
        aggregation: 'monthly',
      });
      const call = mockClient.getVelocityInsights.mock.calls[0][0];
      expect(call).not.toHaveProperty('unit_type_ids');
      expect(call).not.toHaveProperty('team_ids');
      expect(call).not.toHaveProperty('owner_ids');
    });
  });

  describe('getDecisionInsights', () => {
    it('should call client with converted dates and resolve owners', async () => {
      mockClient.getDecisionInsights.mockResolvedValue({ decisions: [] });
      const result = await getDecisionInsights(mockClient as any, {
        from: '2025-03-01T00:00:00Z',
        to: '2025-04-01T00:00:00Z',
        aggregation: 'daily',
        owners: '5',
      });
      expect(mockClient.getDecisionInsights).toHaveBeenCalledWith({
        from: Math.floor(new Date('2025-03-01T00:00:00Z').getTime() / 1000),
        to: Math.floor(new Date('2025-04-01T00:00:00Z').getTime() / 1000),
        aggregation: 'daily',
        owner_ids: [5],
      });
      expect(result.data).toEqual({ decisions: [] });
    });
  });
});
