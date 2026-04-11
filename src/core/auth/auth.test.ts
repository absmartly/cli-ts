import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  whoami,
  createAuthApiKey,
  listAuthApiKeys,
  getAuthApiKey,
  updateAuthApiKey,
  deleteAuthApiKey,
  editProfile,
  resetMyPassword,
} from './auth.js';

describe('auth', () => {
  const mockClient = {
    getCurrentUser: vi.fn(),
    createUserApiKey: vi.fn(),
    listUserApiKeys: vi.fn(),
    getUserApiKey: vi.fn(),
    updateUserApiKey: vi.fn(),
    deleteUserApiKey: vi.fn(),
    updateCurrentUser: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('whoami', () => {
    it('should return current user data', async () => {
      const user = { id: 1, email: 'test@example.com' };
      mockClient.getCurrentUser.mockResolvedValue(user);
      const result = await whoami(mockClient as any);
      expect(mockClient.getCurrentUser).toHaveBeenCalled();
      expect(result.data).toEqual(user);
    });
  });

  describe('createAuthApiKey', () => {
    it('should create api key with name only', async () => {
      mockClient.createUserApiKey.mockResolvedValue({ name: 'k1', key: 'abc' });
      const result = await createAuthApiKey(mockClient as any, { name: 'k1' });
      expect(mockClient.createUserApiKey).toHaveBeenCalledWith('k1', undefined);
      expect(result.data).toEqual({ name: 'k1', key: 'abc' });
    });

    it('should create api key with name and description', async () => {
      mockClient.createUserApiKey.mockResolvedValue({ name: 'k2', key: 'xyz' });
      const result = await createAuthApiKey(mockClient as any, { name: 'k2', description: 'desc' });
      expect(mockClient.createUserApiKey).toHaveBeenCalledWith('k2', 'desc');
      expect(result.data).toEqual({ name: 'k2', key: 'xyz' });
    });
  });

  describe('listAuthApiKeys', () => {
    it('should return list of api keys', async () => {
      const keys = [{ id: 1 }, { id: 2 }];
      mockClient.listUserApiKeys.mockResolvedValue(keys);
      const result = await listAuthApiKeys(mockClient as any);
      expect(mockClient.listUserApiKeys).toHaveBeenCalled();
      expect(result.data).toEqual(keys);
    });
  });

  describe('getAuthApiKey', () => {
    it('should return api key by id', async () => {
      const key = { id: 5, name: 'mykey' };
      mockClient.getUserApiKey.mockResolvedValue(key);
      const result = await getAuthApiKey(mockClient as any, { id: 5 });
      expect(mockClient.getUserApiKey).toHaveBeenCalledWith(5);
      expect(result.data).toEqual(key);
    });
  });

  describe('updateAuthApiKey', () => {
    it('should update api key with name only', async () => {
      mockClient.updateUserApiKey.mockResolvedValue(undefined);
      const result = await updateAuthApiKey(mockClient as any, { id: 3, name: 'newname' });
      expect(mockClient.updateUserApiKey).toHaveBeenCalledWith(3, { name: 'newname' });
      expect(result.data).toBeUndefined();
    });

    it('should update api key with description only', async () => {
      mockClient.updateUserApiKey.mockResolvedValue(undefined);
      const result = await updateAuthApiKey(mockClient as any, { id: 3, description: 'newdesc' });
      expect(mockClient.updateUserApiKey).toHaveBeenCalledWith(3, { description: 'newdesc' });
      expect(result.data).toBeUndefined();
    });

    it('should update api key with both name and description', async () => {
      mockClient.updateUserApiKey.mockResolvedValue(undefined);
      const result = await updateAuthApiKey(mockClient as any, {
        id: 3,
        name: 'n',
        description: 'd',
      });
      expect(mockClient.updateUserApiKey).toHaveBeenCalledWith(3, { name: 'n', description: 'd' });
      expect(result.data).toBeUndefined();
    });

    it('should send empty object when no fields provided', async () => {
      mockClient.updateUserApiKey.mockResolvedValue(undefined);
      const result = await updateAuthApiKey(mockClient as any, { id: 3 });
      expect(mockClient.updateUserApiKey).toHaveBeenCalledWith(3, {});
      expect(result.data).toBeUndefined();
    });
  });

  describe('deleteAuthApiKey', () => {
    it('should delete api key by id', async () => {
      mockClient.deleteUserApiKey.mockResolvedValue(undefined);
      const result = await deleteAuthApiKey(mockClient as any, { id: 7 });
      expect(mockClient.deleteUserApiKey).toHaveBeenCalledWith(7);
      expect(result.data).toBeUndefined();
    });
  });

  describe('editProfile', () => {
    it('should update profile with all fields', async () => {
      const updated = { first_name: 'John', last_name: 'Doe', department: 'Eng', job_title: 'Dev' };
      mockClient.updateCurrentUser.mockResolvedValue(updated);
      const result = await editProfile(mockClient as any, {
        firstName: 'John',
        lastName: 'Doe',
        department: 'Eng',
        jobTitle: 'Dev',
      });
      expect(mockClient.updateCurrentUser).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
        department: 'Eng',
        job_title: 'Dev',
      });
      expect(result.data).toEqual(updated);
    });

    it('should only include provided fields', async () => {
      mockClient.updateCurrentUser.mockResolvedValue({ first_name: 'Jane' });
      const result = await editProfile(mockClient as any, { firstName: 'Jane' });
      expect(mockClient.updateCurrentUser).toHaveBeenCalledWith({ first_name: 'Jane' });
      expect(result.data).toEqual({ first_name: 'Jane' });
    });
  });

  describe('resetMyPassword', () => {
    it('should call API directly with old and new password', async () => {
      mockClient.updateCurrentUser.mockResolvedValue(undefined);
      const result = await resetMyPassword(mockClient as any, {
        oldPassword: 'old123',
        newPassword: 'new456',
      });
      expect(mockClient.updateCurrentUser).toHaveBeenCalledWith({
        old_password: 'old123',
        new_password: 'new456',
      });
      expect(result.data).toBeUndefined();
    });

    it('should not perform any client-side password comparison', async () => {
      mockClient.updateCurrentUser.mockResolvedValue(undefined);
      // Same passwords should still be sent to the API without error
      await resetMyPassword(mockClient as any, {
        oldPassword: 'same',
        newPassword: 'same',
      });
      expect(mockClient.updateCurrentUser).toHaveBeenCalledWith({
        old_password: 'same',
        new_password: 'same',
      });
    });
  });
});
