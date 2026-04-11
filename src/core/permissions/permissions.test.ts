import { describe, it, expect, vi } from 'vitest';
import { listPermissions, listPermissionCategories, listAccessControlPolicies } from './list.js';

describe('permissions', () => {
  const mockClient = {
    listPermissions: vi.fn(),
    listPermissionCategories: vi.fn(),
    listAccessControlPolicies: vi.fn(),
  };

  it('should list permissions', async () => {
    mockClient.listPermissions.mockResolvedValue([{ id: 1, name: 'read' }]);
    const result = await listPermissions(mockClient as any);
    expect(mockClient.listPermissions).toHaveBeenCalled();
    expect(result.data).toEqual([{ id: 1, name: 'read' }]);
  });

  it('should list permission categories', async () => {
    mockClient.listPermissionCategories.mockResolvedValue([{ id: 1, name: 'experiments' }]);
    const result = await listPermissionCategories(mockClient as any);
    expect(mockClient.listPermissionCategories).toHaveBeenCalled();
    expect(result.data).toEqual([{ id: 1, name: 'experiments' }]);
  });

  it('should list access control policies', async () => {
    mockClient.listAccessControlPolicies.mockResolvedValue([{ id: 1, name: 'default' }]);
    const result = await listAccessControlPolicies(mockClient as any);
    expect(mockClient.listAccessControlPolicies).toHaveBeenCalled();
    expect(result.data).toEqual([{ id: 1, name: 'default' }]);
  });
});
