import { describe, it, expect, vi, beforeEach } from 'vitest';
import keytar from 'keytar';

vi.mock('keytar', () => ({
  default: {
    setPassword: vi.fn(),
    getPassword: vi.fn(),
    deletePassword: vi.fn(),
  },
}));

import { setAPIKey, getAPIKey, deleteAPIKey, setPassword, getPassword, deletePassword } from './keyring.js';

describe('Keyring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('profile-specific key naming', () => {
    it('should use key without suffix for default profile', async () => {
      (keytar.setPassword as any).mockResolvedValue(undefined);

      await setAPIKey('test-key', 'default');

      expect(keytar.setPassword).toHaveBeenCalledWith(
        'absmartly-cli',
        'api-key',
        'test-key'
      );
    });

    it('should add profile suffix for non-default profiles', async () => {
      (keytar.setPassword as any).mockResolvedValue(undefined);

      await setAPIKey('staging-key', 'staging');

      expect(keytar.setPassword).toHaveBeenCalledWith(
        'absmartly-cli',
        'api-key-staging',
        'staging-key'
      );
    });

    it('should retrieve correct key for profile', async () => {
      (keytar.getPassword as any).mockResolvedValue('staging-key');

      const key = await getAPIKey('staging');

      expect(keytar.getPassword).toHaveBeenCalledWith(
        'absmartly-cli',
        'api-key-staging'
      );
      expect(key).toBe('staging-key');
    });

    it('should delete correct key for profile', async () => {
      (keytar.deletePassword as any).mockResolvedValue(true);

      const result = await deleteAPIKey('production');

      expect(keytar.deletePassword).toHaveBeenCalledWith(
        'absmartly-cli',
        'api-key-production'
      );
      expect(result).toBe(true);
    });

    it('should handle undefined profile as default', async () => {
      (keytar.setPassword as any).mockResolvedValue(undefined);

      await setAPIKey('default-key');

      expect(keytar.setPassword).toHaveBeenCalledWith(
        'absmartly-cli',
        'api-key',
        'default-key'
      );
    });
  });

  describe('error handling', () => {
    it('should throw helpful error on keyring access denied', async () => {
      (keytar.setPassword as any).mockRejectedValue(new Error('Access denied'));

      await expect(setPassword('test-key', 'value')).rejects.toThrow(
        /Failed to save to system keychain.*Access denied.*keychain is unlocked/
      );
    });

    it('should throw helpful error on keyring unavailable', async () => {
      (keytar.getPassword as any).mockRejectedValue(new Error('Keyring not available'));

      await expect(getPassword('test-key')).rejects.toThrow(
        /Failed to read from system keychain.*Keyring not available.*keychain is unlocked/
      );
    });

    it('should throw helpful error on delete failure', async () => {
      (keytar.deletePassword as any).mockRejectedValue(new Error('Permission denied'));

      await expect(deletePassword('test-key')).rejects.toThrow(
        /Failed to delete from system keychain.*Permission denied.*keychain is unlocked/
      );
    });

    it('should return null for non-existent keys', async () => {
      (keytar.getPassword as any).mockResolvedValue(null);

      const key = await getAPIKey('nonexistent');
      expect(key).toBeNull();
    });

    it('should handle keychain locked error', async () => {
      (keytar.getPassword as any).mockRejectedValue(new Error('The user name or passphrase you entered is not correct'));

      await expect(getAPIKey()).rejects.toThrow(/Failed to read from system keychain/);
    });
  });

  describe('profile isolation', () => {
    it('should keep keys separate by profile', async () => {
      (keytar.setPassword as any).mockResolvedValue(undefined);

      await setAPIKey('dev-key', 'dev');
      await setAPIKey('prod-key', 'prod');

      expect(keytar.setPassword).toHaveBeenNthCalledWith(
        1,
        'absmartly-cli',
        'api-key-dev',
        'dev-key'
      );
      expect(keytar.setPassword).toHaveBeenNthCalledWith(
        2,
        'absmartly-cli',
        'api-key-prod',
        'prod-key'
      );
    });

    it('should retrieve profile-specific keys', async () => {
      (keytar.getPassword as any).mockImplementation((service, key) => {
        if (key === 'api-key-dev') return Promise.resolve('dev-key');
        if (key === 'api-key-prod') return Promise.resolve('prod-key');
        return Promise.resolve(null);
      });

      const devKey = await getAPIKey('dev');
      const prodKey = await getAPIKey('prod');

      expect(devKey).toBe('dev-key');
      expect(prodKey).toBe('prod-key');
    });
  });

  describe('generic key operations', () => {
    it('should handle custom key names with profile', async () => {
      (keytar.setPassword as any).mockResolvedValue(undefined);

      await setPassword('custom-key', 'value', { profile: 'staging' });

      expect(keytar.setPassword).toHaveBeenCalledWith(
        'absmartly-cli',
        'custom-key-staging',
        'value'
      );
    });

    it('should retrieve custom keys', async () => {
      (keytar.getPassword as any).mockResolvedValue('custom-value');

      const value = await getPassword('custom-key', { profile: 'test' });

      expect(keytar.getPassword).toHaveBeenCalledWith(
        'absmartly-cli',
        'custom-key-test'
      );
      expect(value).toBe('custom-value');
    });
  });
});
