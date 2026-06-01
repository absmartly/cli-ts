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

  it('should fetch the current config, merge the new value, and PUT without id', async () => {
    mockClient.getPlatformConfig.mockResolvedValue({
      id: 22,
      name: 'experiment_form_max_secondary_metrics',
      value: '20',
    });
    mockClient.updatePlatformConfig.mockResolvedValue({
      id: 22,
      name: 'experiment_form_max_secondary_metrics',
      value: '30',
    });

    const result = await updatePlatformConfig(mockClient as any, { id: 22, value: '30' });

    expect(mockClient.getPlatformConfig).toHaveBeenCalledWith(22);
    // name comes from GET; id stays out of the body (URL path).
    expect(mockClient.updatePlatformConfig).toHaveBeenCalledWith(22, {
      name: 'experiment_form_max_secondary_metrics',
      value: '30',
    });
    expect(result.data).toEqual({
      id: 22,
      name: 'experiment_form_max_secondary_metrics',
      value: '30',
    });
  });

  it('should accept any JSON value for value (string, number, object)', async () => {
    mockClient.getPlatformConfig.mockResolvedValue({ id: 1, name: 'numeric_cfg', value: 0 });
    mockClient.updatePlatformConfig.mockResolvedValue({ id: 1, name: 'numeric_cfg', value: 42 });

    await updatePlatformConfig(mockClient as any, { id: 1, value: 42 });

    expect(mockClient.updatePlatformConfig).toHaveBeenCalledWith(1, {
      name: 'numeric_cfg',
      value: 42,
    });
  });

  it('should throw a malformed-payload error if GET returns a non-object', async () => {
    mockClient.getPlatformConfig.mockResolvedValue(null);
    mockClient.updatePlatformConfig.mockClear();

    await expect(updatePlatformConfig(mockClient as any, { id: 999, value: 'x' })).rejects.toThrow(
      /malformed payload.*got null/
    );
    expect(mockClient.updatePlatformConfig).not.toHaveBeenCalled();
  });

  it('should wrap GET errors with context and not attempt a PUT', async () => {
    const cause = new Error('network down');
    mockClient.getPlatformConfig.mockRejectedValue(cause);
    mockClient.updatePlatformConfig.mockClear();

    await expect(updatePlatformConfig(mockClient as any, { id: 7, value: 'x' })).rejects.toThrow(
      /failed to fetch existing config/
    );
    expect(mockClient.updatePlatformConfig).not.toHaveBeenCalled();
  });

  it.each([
    ['null', null],
    ['false', false],
    ['zero', 0],
    ['empty string', ''],
    ['empty array', []],
  ])('should accept falsy JSON value: %s', async (_label, falsyValue) => {
    mockClient.getPlatformConfig.mockResolvedValue({ id: 1, name: 'cfg', value: 'old' });
    mockClient.updatePlatformConfig.mockResolvedValue({ id: 1, name: 'cfg', value: falsyValue });

    await updatePlatformConfig(mockClient as any, { id: 1, value: falsyValue });

    expect(mockClient.updatePlatformConfig).toHaveBeenCalledWith(1, {
      name: 'cfg',
      value: falsyValue,
    });
  });
});
