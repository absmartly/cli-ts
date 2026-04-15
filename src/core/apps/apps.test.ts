import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listApps, getApp, createApp, updateApp, archiveApp } from './apps.js';

const mockClient = {
  listApplications: vi.fn(),
  getApplication: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  archiveApplication: vi.fn(),
} as any;

beforeEach(() => vi.clearAllMocks());

describe('listApps', () => {
  it('should call client.listApplications with items and page', async () => {
    const mockData = [{ id: 1 }];
    mockClient.listApplications.mockResolvedValue(mockData);

    const result = await listApps(mockClient, { items: 20, page: 2 });

    expect(mockClient.listApplications).toHaveBeenCalledWith({ items: 20, page: 2 });
    expect(result).toEqual({ data: mockData });
  });
});

describe('getApp', () => {
  it('should call client.getApplication with the id', async () => {
    const mockData = { id: 3, name: 'app' };
    mockClient.getApplication.mockResolvedValue(mockData);

    const result = await getApp(mockClient, { id: 3 as any });

    expect(mockClient.getApplication).toHaveBeenCalledWith(3);
    expect(result).toEqual({ data: mockData });
  });
});

describe('createApp', () => {
  it('should call client.createApplication with name', async () => {
    const mockData = { id: 4, name: 'new-app' };
    mockClient.createApplication.mockResolvedValue(mockData);

    const result = await createApp(mockClient, { name: 'new-app' });

    expect(mockClient.createApplication).toHaveBeenCalledWith({ name: 'new-app' });
    expect(result).toEqual({ data: mockData });
  });
});

describe('updateApp', () => {
  it('should update with name', async () => {
    mockClient.updateApplication.mockResolvedValue(undefined);

    const result = await updateApp(mockClient, { id: 5 as any, name: 'updated' });

    expect(mockClient.updateApplication).toHaveBeenCalledWith(5, { name: 'updated' });
    expect(result).toEqual({ data: { id: 5 } });
  });

  it('should throw when no fields provided', async () => {
    await expect(updateApp(mockClient, { id: 5 as any })).rejects.toThrow(
      'At least one update field must be provided'
    );
  });
});

describe('archiveApp', () => {
  it('should archive an app', async () => {
    mockClient.archiveApplication.mockResolvedValue(undefined);

    const result = await archiveApp(mockClient, { id: 6 as any });

    expect(mockClient.archiveApplication).toHaveBeenCalledWith(6, undefined);
    expect(result).toEqual({ data: { id: 6, archived: true } });
  });

  it('should unarchive an app when unarchive is true', async () => {
    mockClient.archiveApplication.mockResolvedValue(undefined);

    const result = await archiveApp(mockClient, { id: 6 as any, unarchive: true });

    expect(mockClient.archiveApplication).toHaveBeenCalledWith(6, true);
    expect(result).toEqual({ data: { id: 6, archived: false } });
  });
});
