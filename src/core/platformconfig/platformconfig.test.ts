import { describe, it, expect, vi } from 'vitest';
import { listPlatformConfigs, getPlatformConfig, updatePlatformConfig } from './platformconfig.js';

describe('platformconfig', () => {
  const mockClient = {
    listPlatformConfigs: vi.fn(),
    getPlatformConfig: vi.fn(),
    updatePlatformConfig: vi.fn(),
  };

  it('should list platform configs', async () => {
    mockClient.listPlatformConfigs.mockResolvedValue([{ id: 1 }]);
    const result = await listPlatformConfigs(mockClient as any);
    expect(mockClient.listPlatformConfigs).toHaveBeenCalled();
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should get platform config by id', async () => {
    mockClient.getPlatformConfig.mockResolvedValue({ id: 1, key: 'val' });
    const result = await getPlatformConfig(mockClient as any, { id: 1 });
    expect(mockClient.getPlatformConfig).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1, key: 'val' });
  });

  it('should update platform config', async () => {
    const value = { setting: true };
    mockClient.updatePlatformConfig.mockResolvedValue({ id: 1, setting: true });
    const result = await updatePlatformConfig(mockClient as any, { id: 1, value });
    expect(mockClient.updatePlatformConfig).toHaveBeenCalledWith(1, value);
    expect(result.data).toEqual({ id: 1, setting: true });
  });
});
