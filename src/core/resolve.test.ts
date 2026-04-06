import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveTagIds,
  resolveTeamIds,
  resolveOwnerIds,
  resolveApplicationIds,
  resolveUnitTypeIds,
} from './resolve.js';

describe('resolve helpers', () => {
  const mockClient = {
    resolveTags: vi.fn(),
    resolveTeams: vi.fn(),
    resolveUsers: vi.fn(),
    resolveApplications: vi.fn(),
    resolveUnitTypes: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveTagIds', () => {
    it('should pass through numeric IDs without calling the API', async () => {
      const result = await resolveTagIds(mockClient as any, '1,2,3');
      expect(result).toBe('1,2,3');
      expect(mockClient.resolveTags).not.toHaveBeenCalled();
    });

    it('should resolve names via client', async () => {
      mockClient.resolveTags.mockResolvedValue([
        { id: 1, tag: 'v1' },
        { id: 5, tag: 'mobile' },
      ]);
      const result = await resolveTagIds(mockClient as any, 'v1,mobile');
      expect(mockClient.resolveTags).toHaveBeenCalledWith(['v1', 'mobile']);
      expect(result).toBe('1,5');
    });

    it('should resolve mixed names and IDs via client', async () => {
      mockClient.resolveTags.mockResolvedValue([
        { id: 1, tag: 'v1' },
        { id: 3, tag: 'pricing' },
      ]);
      const result = await resolveTagIds(mockClient as any, 'v1,3');
      expect(mockClient.resolveTags).toHaveBeenCalled();
      expect(result).toBe('1,3');
    });
  });

  describe('resolveTeamIds', () => {
    it('should pass through numeric IDs without calling the API', async () => {
      const result = await resolveTeamIds(mockClient as any, '10,20');
      expect(result).toBe('10,20');
      expect(mockClient.resolveTeams).not.toHaveBeenCalled();
    });

    it('should resolve names via client', async () => {
      mockClient.resolveTeams.mockResolvedValue([
        { id: 10, name: 'Product' },
        { id: 20, name: 'Engineering' },
      ]);
      const result = await resolveTeamIds(mockClient as any, 'Product,Engineering');
      expect(result).toBe('10,20');
    });
  });

  describe('resolveOwnerIds', () => {
    it('should pass through numeric IDs without calling the API', async () => {
      const result = await resolveOwnerIds(mockClient as any, '5');
      expect(result).toBe('5');
      expect(mockClient.resolveUsers).not.toHaveBeenCalled();
    });

    it('should resolve emails via client', async () => {
      mockClient.resolveUsers.mockResolvedValue([{ id: 5, email: 'alice@example.com' }]);
      const result = await resolveOwnerIds(mockClient as any, 'alice@example.com');
      expect(result).toBe('5');
    });
  });

  describe('resolveApplicationIds', () => {
    it('should pass through numeric IDs without calling the API', async () => {
      const result = await resolveApplicationIds(mockClient as any, '1,2');
      expect(result).toBe('1,2');
      expect(mockClient.resolveApplications).not.toHaveBeenCalled();
    });

    it('should resolve names via client', async () => {
      mockClient.resolveApplications.mockResolvedValue([
        { id: 1, name: 'web' },
        { id: 2, name: 'ios' },
      ]);
      const result = await resolveApplicationIds(mockClient as any, 'web,ios');
      expect(result).toBe('1,2');
    });
  });

  describe('resolveUnitTypeIds', () => {
    it('should pass through numeric IDs without calling the API', async () => {
      const result = await resolveUnitTypeIds(mockClient as any, '1');
      expect(result).toBe('1');
      expect(mockClient.resolveUnitTypes).not.toHaveBeenCalled();
    });

    it('should resolve names via client', async () => {
      mockClient.resolveUnitTypes.mockResolvedValue([{ id: 1, name: 'user_id' }]);
      const result = await resolveUnitTypeIds(mockClient as any, 'user_id');
      expect(result).toBe('1');
    });
  });
});
