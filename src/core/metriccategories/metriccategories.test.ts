import { describe, it, expect, vi } from 'vitest';
import {
  listMetricCategories,
  getMetricCategory,
  createMetricCategory,
  updateMetricCategory,
  archiveMetricCategory,
} from './metriccategories.js';

describe('metriccategories', () => {
  const mockClient = {
    listMetricCategories: vi.fn(),
    getMetricCategory: vi.fn(),
    createMetricCategory: vi.fn(),
    updateMetricCategory: vi.fn(),
    archiveMetricCategory: vi.fn(),
  };

  it('should list metric categories with pagination', async () => {
    mockClient.listMetricCategories.mockResolvedValue([{ id: 1 }]);
    const result = await listMetricCategories(mockClient as any, { items: 25, page: 1 });
    expect(mockClient.listMetricCategories).toHaveBeenCalledWith(25, 1);
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should get metric category by id', async () => {
    mockClient.getMetricCategory.mockResolvedValue({ id: 1, name: 'cat1' });
    const result = await getMetricCategory(mockClient as any, { id: 1 as any });
    expect(mockClient.getMetricCategory).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1, name: 'cat1' });
  });

  it('should create metric category with required fields', async () => {
    mockClient.createMetricCategory.mockResolvedValue({ id: 2 });
    const result = await createMetricCategory(mockClient as any, { name: 'cat', color: '#fff' });
    expect(mockClient.createMetricCategory).toHaveBeenCalledWith({ name: 'cat', color: '#fff' });
    expect(result.data).toEqual({ id: 2 });
  });

  it('should create metric category with description', async () => {
    mockClient.createMetricCategory.mockResolvedValue({ id: 3 });
    const result = await createMetricCategory(mockClient as any, {
      name: 'cat',
      color: '#000',
      description: 'desc',
    });
    expect(mockClient.createMetricCategory).toHaveBeenCalledWith({
      name: 'cat',
      color: '#000',
      description: 'desc',
    });
    expect(result.data).toEqual({ id: 3 });
  });

  it('should update metric category with name', async () => {
    mockClient.updateMetricCategory.mockResolvedValue({ id: 1, name: 'updated' });
    const result = await updateMetricCategory(mockClient as any, { id: 1 as any, name: 'updated' });
    expect(mockClient.updateMetricCategory).toHaveBeenCalledWith(1, { name: 'updated' });
    expect(result.data).toEqual({ id: 1, name: 'updated' });
  });

  it('should throw when updating with no fields', async () => {
    await expect(updateMetricCategory(mockClient as any, { id: 1 as any })).rejects.toThrow(
      'At least one update field must be provided'
    );
  });

  it('should archive metric category', async () => {
    mockClient.archiveMetricCategory.mockResolvedValue(undefined);
    const result = await archiveMetricCategory(mockClient as any, { id: 1 as any });
    expect(mockClient.archiveMetricCategory).toHaveBeenCalledWith(1, true);
    expect(result.data).toEqual({ id: 1, archived: true });
  });

  it('should unarchive metric category', async () => {
    mockClient.archiveMetricCategory.mockResolvedValue(undefined);
    const result = await archiveMetricCategory(mockClient as any, {
      id: 1 as any,
      unarchive: true,
    });
    expect(mockClient.archiveMetricCategory).toHaveBeenCalledWith(1, false);
    expect(result.data).toEqual({ id: 1, archived: false });
  });
});
