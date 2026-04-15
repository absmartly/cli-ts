import { describe, it, expect, vi } from 'vitest';
import { listRoles, getRole, createRole, updateRole, deleteRole } from './roles.js';

describe('roles', () => {
  const mockClient = {
    listRoles: vi.fn(),
    getRole: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
  };

  it('should list roles with pagination', async () => {
    mockClient.listRoles.mockResolvedValue([{ id: 1 }]);
    const result = await listRoles(mockClient as any, { items: 25, page: 1 });
    expect(mockClient.listRoles).toHaveBeenCalledWith({ items: 25, page: 1 });
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should get role by id', async () => {
    mockClient.getRole.mockResolvedValue({ id: 1, name: 'admin' });
    const result = await getRole(mockClient as any, { id: 1 as any });
    expect(mockClient.getRole).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1, name: 'admin' });
  });

  it('should create role with name only', async () => {
    mockClient.createRole.mockResolvedValue({ id: 2 });
    const result = await createRole(mockClient as any, { name: 'editor' });
    expect(mockClient.createRole).toHaveBeenCalledWith({ name: 'editor' });
    expect(result.data).toEqual({ id: 2 });
  });

  it('should create role with description', async () => {
    mockClient.createRole.mockResolvedValue({ id: 3 });
    const result = await createRole(mockClient as any, { name: 'editor', description: 'desc' });
    expect(mockClient.createRole).toHaveBeenCalledWith({ name: 'editor', description: 'desc' });
    expect(result.data).toEqual({ id: 3 });
  });

  it('should update role with name', async () => {
    mockClient.updateRole.mockResolvedValue(undefined);
    const result = await updateRole(mockClient as any, { id: 1 as any, name: 'updated' });
    expect(mockClient.updateRole).toHaveBeenCalledWith(1, { name: 'updated' });
    expect(result.data).toEqual({ id: 1 });
  });

  it('should throw when updating with no fields', async () => {
    await expect(updateRole(mockClient as any, { id: 1 as any })).rejects.toThrow(
      'At least one update field must be provided'
    );
  });

  it('should delete role', async () => {
    mockClient.deleteRole.mockResolvedValue(undefined);
    const result = await deleteRole(mockClient as any, { id: 1 as any });
    expect(mockClient.deleteRole).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1 });
  });
});
