import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listApiKeys, getApiKey, createApiKey, updateApiKey, deleteApiKey } from './apikeys.js';

const mockClient = {
  listApiKeys: vi.fn(),
  getApiKey: vi.fn(),
  createApiKey: vi.fn(),
  updateApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
} as any;

beforeEach(() => vi.clearAllMocks());

describe('listApiKeys', () => {
  it('should call client.listApiKeys with items and page', async () => {
    const mockData = [{ id: 1 }, { id: 2 }];
    mockClient.listApiKeys.mockResolvedValue(mockData);

    const result = await listApiKeys(mockClient, { items: 10, page: 1 });

    expect(mockClient.listApiKeys).toHaveBeenCalledWith(10, 1);
    expect(result).toEqual({ data: mockData });
  });
});

describe('getApiKey', () => {
  it('should call client.getApiKey with the id', async () => {
    const mockData = { id: 5, name: 'key' };
    mockClient.getApiKey.mockResolvedValue(mockData);

    const result = await getApiKey(mockClient, { id: 5 as any });

    expect(mockClient.getApiKey).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: mockData });
  });
});

describe('createApiKey', () => {
  it('should create with name only', async () => {
    const mockResponse = { id: 10, key: 'abc123' };
    mockClient.createApiKey.mockResolvedValue(mockResponse);

    const result = await createApiKey(mockClient, { name: 'my-key' });

    expect(mockClient.createApiKey).toHaveBeenCalledWith({ name: 'my-key' });
    expect(result).toEqual({ data: { id: 10, key: 'abc123' } });
  });

  it('should include description and permissions when provided', async () => {
    const mockResponse = { id: 11, key: 'xyz789' };
    mockClient.createApiKey.mockResolvedValue(mockResponse);

    const result = await createApiKey(mockClient, {
      name: 'my-key',
      description: 'desc',
      permissions: 'read',
    });

    expect(mockClient.createApiKey).toHaveBeenCalledWith({
      name: 'my-key',
      description: 'desc',
      permissions: 'read',
    });
    expect(result).toEqual({ data: { id: 11, key: 'xyz789' } });
  });

  it('should handle response without key field', async () => {
    const mockResponse = { id: 12 };
    mockClient.createApiKey.mockResolvedValue(mockResponse);

    const result = await createApiKey(mockClient, { name: 'no-key' });

    expect(result).toEqual({ data: { id: 12, key: undefined } });
  });
});

describe('updateApiKey', () => {
  it('should update with name', async () => {
    mockClient.updateApiKey.mockResolvedValue(undefined);

    const result = await updateApiKey(mockClient, { id: 5 as any, name: 'new-name' });

    expect(mockClient.updateApiKey).toHaveBeenCalledWith(5, { name: 'new-name' });
    expect(result).toEqual({ data: { id: 5 } });
  });

  it('should update with description', async () => {
    mockClient.updateApiKey.mockResolvedValue(undefined);

    const result = await updateApiKey(mockClient, { id: 5 as any, description: 'new-desc' });

    expect(mockClient.updateApiKey).toHaveBeenCalledWith(5, { description: 'new-desc' });
    expect(result).toEqual({ data: { id: 5 } });
  });

  it('should throw when no fields provided', async () => {
    await expect(updateApiKey(mockClient, { id: 5 as any })).rejects.toThrow(
      'At least one update field must be provided'
    );
  });
});

describe('deleteApiKey', () => {
  it('should call client.deleteApiKey with the id', async () => {
    mockClient.deleteApiKey.mockResolvedValue(undefined);

    const result = await deleteApiKey(mockClient, { id: 7 as any });

    expect(mockClient.deleteApiKey).toHaveBeenCalledWith(7);
    expect(result).toEqual({ data: { id: 7 } });
  });
});
