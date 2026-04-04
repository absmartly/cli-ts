import { describe, it, expect, vi } from 'vitest';
import { addFavorite, removeFavorite } from './favorites.js';

describe('favorites', () => {
  const mockClient = {
    favoriteExperiment: vi.fn(),
    favoriteMetric: vi.fn(),
  };

  it('should add experiment favorite', async () => {
    mockClient.favoriteExperiment.mockResolvedValue(undefined);
    const result = await addFavorite(mockClient as any, { type: 'experiment', id: 1 });
    expect(mockClient.favoriteExperiment).toHaveBeenCalledWith(1, true);
    expect(result.data).toBeUndefined();
  });

  it('should add metric favorite', async () => {
    mockClient.favoriteMetric.mockResolvedValue(undefined);
    const result = await addFavorite(mockClient as any, { type: 'metric', id: 5 });
    expect(mockClient.favoriteMetric).toHaveBeenCalledWith(5, true);
    expect(result.data).toBeUndefined();
  });

  it('should throw on invalid type for addFavorite', async () => {
    await expect(addFavorite(mockClient as any, { type: 'invalid', id: 1 })).rejects.toThrow(
      'Invalid type "invalid". Must be "experiment" or "metric".'
    );
  });

  it('should remove experiment favorite', async () => {
    mockClient.favoriteExperiment.mockResolvedValue(undefined);
    const result = await removeFavorite(mockClient as any, { type: 'experiment', id: 1 });
    expect(mockClient.favoriteExperiment).toHaveBeenCalledWith(1, false);
    expect(result.data).toBeUndefined();
  });

  it('should remove metric favorite', async () => {
    mockClient.favoriteMetric.mockResolvedValue(undefined);
    const result = await removeFavorite(mockClient as any, { type: 'metric', id: 5 });
    expect(mockClient.favoriteMetric).toHaveBeenCalledWith(5, false);
    expect(result.data).toBeUndefined();
  });

  it('should throw on invalid type for removeFavorite', async () => {
    await expect(removeFavorite(mockClient as any, { type: 'invalid', id: 1 })).rejects.toThrow(
      'Invalid type "invalid". Must be "experiment" or "metric".'
    );
  });
});
