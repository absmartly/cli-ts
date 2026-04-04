import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveUserId,
  listUserApiKeys,
  getUserApiKey,
  createUserApiKey,
  updateUserApiKey,
  deleteUserApiKey,
} from './api-keys.js';

const mockClient = {
  resolveUsers: vi.fn(),
  listUserApiKeysByUserId: vi.fn(),
  getUserApiKeyByUserId: vi.fn(),
  createUserApiKeyByUserId: vi.fn(),
  updateUserApiKeyByUserId: vi.fn(),
  deleteUserApiKeyByUserId: vi.fn(),
} as any;

beforeEach(() => vi.clearAllMocks());

describe('resolveUserId', () => {
  it('should return branded ID for numeric string', async () => {
    const result = await resolveUserId(mockClient, '42');
    expect(result).toBe(42);
    expect(mockClient.resolveUsers).not.toHaveBeenCalled();
  });

  it('should resolve via API for email', async () => {
    mockClient.resolveUsers.mockResolvedValue([{ id: 99, email: 'user@test.com' }]);

    const result = await resolveUserId(mockClient, 'user@test.com');
    expect(mockClient.resolveUsers).toHaveBeenCalledWith(['user@test.com']);
    expect(result).toBe(99);
  });

  it('should throw "User not found" on empty result', async () => {
    mockClient.resolveUsers.mockResolvedValue([]);

    await expect(resolveUserId(mockClient, 'unknown@test.com')).rejects.toThrow(
      'User "unknown@test.com" not found'
    );
  });

  it('should throw "User not found" on null result', async () => {
    mockClient.resolveUsers.mockResolvedValue(null);

    await expect(resolveUserId(mockClient, 'nobody@test.com')).rejects.toThrow(
      'User "nobody@test.com" not found'
    );
  });
});

describe('listUserApiKeys', () => {
  it('should list keys with pagination', async () => {
    const keys = [{ id: 1 }, { id: 2 }];
    mockClient.resolveUsers.mockResolvedValue([{ id: 10 }]);
    mockClient.listUserApiKeysByUserId.mockResolvedValue(keys);

    const result = await listUserApiKeys(mockClient, {
      userRef: 'user@test.com',
      items: 10,
      page: 2,
    });

    expect(mockClient.listUserApiKeysByUserId).toHaveBeenCalledWith(10, 10, 2);
    expect(result.data).toEqual(keys);
    expect(result.pagination).toEqual({ page: 2, items: 10, hasMore: false });
  });

  it('should use defaults for items and page', async () => {
    const keys = Array.from({ length: 25 }, (_, i) => ({ id: i }));
    mockClient.listUserApiKeysByUserId.mockResolvedValue(keys);

    const result = await listUserApiKeys(mockClient, { userRef: '5' });

    expect(mockClient.listUserApiKeysByUserId).toHaveBeenCalledWith(5, undefined, undefined);
    expect(result.pagination).toEqual({ page: 1, items: 25, hasMore: true });
  });
});

describe('getUserApiKey', () => {
  it('should get a single key by id', async () => {
    const key = { id: 3, name: 'mykey' };
    mockClient.getUserApiKeyByUserId.mockResolvedValue(key);

    const result = await getUserApiKey(mockClient, { userRef: '5', keyId: 3 });

    expect(mockClient.getUserApiKeyByUserId).toHaveBeenCalledWith(5, 3);
    expect(result).toEqual({ data: key });
  });
});

describe('createUserApiKey', () => {
  it('should create with name only', async () => {
    const resp = { name: 'k', key: 'secret' };
    mockClient.createUserApiKeyByUserId.mockResolvedValue(resp);

    const result = await createUserApiKey(mockClient, { userRef: '1', name: 'k' });

    expect(mockClient.createUserApiKeyByUserId).toHaveBeenCalledWith(1, { name: 'k' });
    expect(result).toEqual({ data: { name: 'k', key: 'secret' } });
  });

  it('should include description when provided', async () => {
    const resp = { name: 'k', key: 'secret' };
    mockClient.createUserApiKeyByUserId.mockResolvedValue(resp);

    const result = await createUserApiKey(mockClient, {
      userRef: '1',
      name: 'k',
      description: 'desc',
    });

    expect(mockClient.createUserApiKeyByUserId).toHaveBeenCalledWith(1, {
      name: 'k',
      description: 'desc',
    });
    expect(result.data).toEqual({ name: 'k', key: 'secret' });
  });
});

describe('updateUserApiKey', () => {
  it('should update with name', async () => {
    mockClient.updateUserApiKeyByUserId.mockResolvedValue(undefined);

    const result = await updateUserApiKey(mockClient, {
      userRef: '1',
      keyId: 5,
      name: 'new-name',
    });

    expect(mockClient.updateUserApiKeyByUserId).toHaveBeenCalledWith(1, 5, { name: 'new-name' });
    expect(result).toEqual({ data: undefined });
  });

  it('should throw when no update fields', async () => {
    await expect(
      updateUserApiKey(mockClient, { userRef: '1', keyId: 5 })
    ).rejects.toThrow('At least one update field is required');
  });
});

describe('deleteUserApiKey', () => {
  it('should delete key', async () => {
    mockClient.deleteUserApiKeyByUserId.mockResolvedValue(undefined);

    const result = await deleteUserApiKey(mockClient, { userRef: '1', keyId: 7 });

    expect(mockClient.deleteUserApiKeyByUserId).toHaveBeenCalledWith(1, 7);
    expect(result).toEqual({ data: undefined });
  });
});
