import { describe, it, expect, vi } from 'vitest';
import {
  listSegments,
  getSegment,
  createSegment,
  updateSegment,
  deleteSegment,
} from './segments.js';

vi.mock('../../api-client/entity-summary.js', () => ({
  summarizeSegmentRow: (s: Record<string, unknown>) => ({ id: s.id, name: s.name }),
  summarizeSegment: (s: Record<string, unknown>) => ({ id: s.id, name: s.name }),
  applyShowExclude: (_summary: unknown, _full: unknown, _show: string[], _exclude: string[]) => ({
    id: 1,
    name: 'seg1',
  }),
}));

describe('segments', () => {
  const mockClient = {
    listSegments: vi.fn(),
    getSegment: vi.fn(),
    createSegment: vi.fn(),
    updateSegment: vi.fn(),
    deleteSegment: vi.fn(),
  };

  it('should list segments with pagination and rows', async () => {
    mockClient.listSegments.mockResolvedValue([{ id: 1, name: 'seg1' }]);
    const result = await listSegments(mockClient as any, { items: 25, page: 1 });
    expect(mockClient.listSegments).toHaveBeenCalledWith({ items: 25, page: 1 });
    expect(result.data).toEqual([{ id: 1, name: 'seg1' }]);
    expect(result.rows).toEqual([{ id: 1, name: 'seg1' }]);
  });

  it('should get segment by id with summary', async () => {
    mockClient.getSegment.mockResolvedValue({ id: 1, name: 'seg1', extra: 'data' });
    const result = await getSegment(mockClient as any, { id: 1 as any });
    expect(mockClient.getSegment).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1, name: 'seg1' });
  });

  it('should get segment by id raw', async () => {
    const raw = { id: 1, name: 'seg1', extra: 'data' };
    mockClient.getSegment.mockResolvedValue(raw);
    const result = await getSegment(mockClient as any, { id: 1 as any, raw: true });
    expect(result.data).toEqual(raw);
  });

  it('should create segment with required fields', async () => {
    mockClient.createSegment.mockResolvedValue({ id: 2 });
    const result = await createSegment(mockClient as any, { name: 'seg', attribute: 'attr' });
    expect(mockClient.createSegment).toHaveBeenCalledWith({
      name: 'seg',
      value_source_attribute: 'attr',
    });
    expect(result.data).toEqual({ id: 2 });
  });

  it('should create segment with description', async () => {
    mockClient.createSegment.mockResolvedValue({ id: 3 });
    const result = await createSegment(mockClient as any, {
      name: 'seg',
      attribute: 'attr',
      description: 'desc',
    });
    expect(mockClient.createSegment).toHaveBeenCalledWith({
      name: 'seg',
      value_source_attribute: 'attr',
      description: 'desc',
    });
    expect(result.data).toEqual({ id: 3 });
  });

  it('should update segment with displayName', async () => {
    mockClient.updateSegment.mockResolvedValue(undefined);
    const result = await updateSegment(mockClient as any, {
      id: 1 as any,
      displayName: 'new name',
    });
    expect(mockClient.updateSegment).toHaveBeenCalledWith(1, { display_name: 'new name' });
    expect(result.data).toEqual({ id: 1 });
  });

  it('should throw when updating with no fields', async () => {
    await expect(updateSegment(mockClient as any, { id: 1 as any })).rejects.toThrow(
      'At least one update field must be provided'
    );
  });

  it('should delete segment', async () => {
    mockClient.deleteSegment.mockResolvedValue(undefined);
    const result = await deleteSegment(mockClient as any, { id: 1 as any });
    expect(mockClient.deleteSegment).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1 });
  });
});
