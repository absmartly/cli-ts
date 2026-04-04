import { describe, it, expect, vi } from 'vitest';
import {
  listAnnotations,
  createAnnotation,
  updateAnnotation,
  archiveAnnotation,
} from './annotations.js';

describe('experiments/annotations', () => {
  const mockClient = {
    listAnnotations: vi.fn(),
    createAnnotation: vi.fn(),
    updateAnnotation: vi.fn(),
    archiveAnnotation: vi.fn(),
  };

  it('should list annotations', async () => {
    const annotations = [{ id: 1 }];
    mockClient.listAnnotations.mockResolvedValue(annotations);
    const result = await listAnnotations(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.listAnnotations).toHaveBeenCalledWith(10);
    expect(result.data).toEqual(annotations);
  });

  it('should create annotation without type', async () => {
    const annotation = { id: 2 };
    mockClient.createAnnotation.mockResolvedValue(annotation);
    const result = await createAnnotation(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.createAnnotation).toHaveBeenCalledWith({ experiment_id: 10 });
    expect(result.data).toEqual(annotation);
  });

  it('should create annotation with type', async () => {
    const annotation = { id: 3 };
    mockClient.createAnnotation.mockResolvedValue(annotation);
    const result = await createAnnotation(mockClient as any, {
      experimentId: 10 as any,
      type: 'deploy',
    });
    expect(mockClient.createAnnotation).toHaveBeenCalledWith({ experiment_id: 10, type: 'deploy' });
    expect(result.data).toEqual(annotation);
  });

  it('should update annotation', async () => {
    const annotation = { id: 5, type: 'new-type' };
    mockClient.updateAnnotation.mockResolvedValue(annotation);
    const result = await updateAnnotation(mockClient as any, {
      annotationId: 5 as any,
      type: 'new-type',
    });
    expect(mockClient.updateAnnotation).toHaveBeenCalledWith(5, { type: 'new-type' });
    expect(result.data).toEqual(annotation);
  });

  it('should throw when updating with no fields', async () => {
    await expect(
      updateAnnotation(mockClient as any, { annotationId: 5 as any }),
    ).rejects.toThrow('At least one update field is required');
  });

  it('should archive annotation', async () => {
    mockClient.archiveAnnotation.mockResolvedValue(undefined);
    const result = await archiveAnnotation(mockClient as any, { annotationId: 5 as any });
    expect(mockClient.archiveAnnotation).toHaveBeenCalledWith(5, false);
    expect(result.data).toEqual({ annotationId: 5, action: 'archived' });
  });

  it('should unarchive annotation', async () => {
    mockClient.archiveAnnotation.mockResolvedValue(undefined);
    const result = await archiveAnnotation(mockClient as any, {
      annotationId: 5 as any,
      unarchive: true,
    });
    expect(mockClient.archiveAnnotation).toHaveBeenCalledWith(5, true);
    expect(result.data).toEqual({ annotationId: 5, action: 'unarchived' });
  });
});
