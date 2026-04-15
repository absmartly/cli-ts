import { describe, it, expect, vi } from 'vitest';
import { listEnvs, getEnv, createEnv, updateEnv, archiveEnv } from './envs.js';

describe('envs', () => {
  const mockClient = {
    listEnvironments: vi.fn(),
    getEnvironment: vi.fn(),
    createEnvironment: vi.fn(),
    updateEnvironment: vi.fn(),
    archiveEnvironment: vi.fn(),
  };

  it('should list environments with pagination', async () => {
    mockClient.listEnvironments.mockResolvedValue([{ id: 1 }]);
    const result = await listEnvs(mockClient as any, { items: 25, page: 1 });
    expect(mockClient.listEnvironments).toHaveBeenCalledWith({ items: 25, page: 1 });
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should get environment by id', async () => {
    mockClient.getEnvironment.mockResolvedValue({ id: 1, name: 'production' });
    const result = await getEnv(mockClient as any, { id: 1 as any });
    expect(mockClient.getEnvironment).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1, name: 'production' });
  });

  it('should create environment', async () => {
    mockClient.createEnvironment.mockResolvedValue({ id: 2, name: 'staging' });
    const result = await createEnv(mockClient as any, { name: 'staging' });
    expect(mockClient.createEnvironment).toHaveBeenCalledWith({ name: 'staging' });
    expect(result.data).toEqual({ id: 2, name: 'staging' });
  });

  it('should update environment with name', async () => {
    mockClient.updateEnvironment.mockResolvedValue(undefined);
    const result = await updateEnv(mockClient as any, { id: 1 as any, name: 'updated' });
    expect(mockClient.updateEnvironment).toHaveBeenCalledWith(1, { name: 'updated' });
    expect(result.data).toEqual({ id: 1 });
  });

  it('should throw when updating with no fields', async () => {
    await expect(updateEnv(mockClient as any, { id: 1 as any })).rejects.toThrow(
      'At least one update field must be provided'
    );
  });

  it('should archive environment', async () => {
    mockClient.archiveEnvironment.mockResolvedValue(undefined);
    const result = await archiveEnv(mockClient as any, { id: 1 as any });
    expect(mockClient.archiveEnvironment).toHaveBeenCalledWith(1, undefined);
    expect(result.data).toEqual({ id: 1, archived: true });
  });

  it('should unarchive environment', async () => {
    mockClient.archiveEnvironment.mockResolvedValue(undefined);
    const result = await archiveEnv(mockClient as any, { id: 1 as any, unarchive: true });
    expect(mockClient.archiveEnvironment).toHaveBeenCalledWith(1, true);
    expect(result.data).toEqual({ id: 1, archived: false });
  });
});
