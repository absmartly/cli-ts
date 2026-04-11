import { describe, it, expect, vi } from 'vitest';
import {
  listMetricTags,
  getMetricTag,
  createMetricTag,
  updateMetricTag,
  deleteMetricTag,
} from './metrictags.js';

describe('metrictags', () => {
  const mockClient = {
    listMetricTags: vi.fn(),
    getMetricTag: vi.fn(),
    createMetricTag: vi.fn(),
    updateMetricTag: vi.fn(),
    deleteMetricTag: vi.fn(),
  };

  it('should list metric tags with pagination', async () => {
    mockClient.listMetricTags.mockResolvedValue([{ id: 1 }]);
    const result = await listMetricTags(mockClient as any, { items: 25, page: 1 });
    expect(mockClient.listMetricTags).toHaveBeenCalledWith(25, 1);
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should get metric tag by id', async () => {
    mockClient.getMetricTag.mockResolvedValue({ id: 1, tag: 'test' });
    const result = await getMetricTag(mockClient as any, { id: 1 as any });
    expect(mockClient.getMetricTag).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1, tag: 'test' });
  });

  it('should create metric tag', async () => {
    mockClient.createMetricTag.mockResolvedValue({ id: 2, tag: 'newtag' });
    const result = await createMetricTag(mockClient as any, { tag: 'newtag' });
    expect(mockClient.createMetricTag).toHaveBeenCalledWith({ tag: 'newtag' });
    expect(result.data).toEqual({ id: 2, tag: 'newtag' });
  });

  it('should update metric tag', async () => {
    mockClient.updateMetricTag.mockResolvedValue({ id: 1, tag: 'updated' });
    const result = await updateMetricTag(mockClient as any, { id: 1 as any, tag: 'updated' });
    expect(mockClient.updateMetricTag).toHaveBeenCalledWith(1, { tag: 'updated' });
    expect(result.data).toEqual({ id: 1, tag: 'updated' });
  });

  it('should throw when updating with no fields', async () => {
    await expect(updateMetricTag(mockClient as any, { id: 1 as any })).rejects.toThrow(
      'At least one update field must be provided'
    );
  });

  it('should delete metric tag', async () => {
    mockClient.deleteMetricTag.mockResolvedValue(undefined);
    const result = await deleteMetricTag(mockClient as any, { id: 1 as any });
    expect(mockClient.deleteMetricTag).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1 });
  });
});
