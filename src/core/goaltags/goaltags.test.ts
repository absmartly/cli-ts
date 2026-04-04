import { describe, it, expect, vi } from 'vitest';
import { listGoalTags, getGoalTag, createGoalTag, updateGoalTag, deleteGoalTag } from './goaltags.js';

describe('goaltags', () => {
  const mockClient = {
    listGoalTags: vi.fn(),
    getGoalTag: vi.fn(),
    createGoalTag: vi.fn(),
    updateGoalTag: vi.fn(),
    deleteGoalTag: vi.fn(),
  };

  it('should list goal tags with pagination', async () => {
    mockClient.listGoalTags.mockResolvedValue([{ id: 1 }]);
    const result = await listGoalTags(mockClient as any, { items: 25, page: 1 });
    expect(mockClient.listGoalTags).toHaveBeenCalledWith(25, 1);
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should get goal tag by id', async () => {
    mockClient.getGoalTag.mockResolvedValue({ id: 1, tag: 'test' });
    const result = await getGoalTag(mockClient as any, { id: 1 as any });
    expect(mockClient.getGoalTag).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1, tag: 'test' });
  });

  it('should create goal tag', async () => {
    mockClient.createGoalTag.mockResolvedValue({ id: 2, tag: 'newtag' });
    const result = await createGoalTag(mockClient as any, { tag: 'newtag' });
    expect(mockClient.createGoalTag).toHaveBeenCalledWith({ tag: 'newtag' });
    expect(result.data).toEqual({ id: 2, tag: 'newtag' });
  });

  it('should update goal tag', async () => {
    mockClient.updateGoalTag.mockResolvedValue({ id: 1, tag: 'updated' });
    const result = await updateGoalTag(mockClient as any, { id: 1 as any, tag: 'updated' });
    expect(mockClient.updateGoalTag).toHaveBeenCalledWith(1, { tag: 'updated' });
    expect(result.data).toEqual({ id: 1, tag: 'updated' });
  });

  it('should throw when updating with no fields', async () => {
    await expect(updateGoalTag(mockClient as any, { id: 1 as any })).rejects.toThrow(
      'At least one update field must be provided'
    );
  });

  it('should delete goal tag', async () => {
    mockClient.deleteGoalTag.mockResolvedValue(undefined);
    const result = await deleteGoalTag(mockClient as any, { id: 1 as any });
    expect(mockClient.deleteGoalTag).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1 });
  });
});
