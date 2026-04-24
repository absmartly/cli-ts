import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CREDENTIALS_FILE = join(homedir(), '.config', 'absmartly', 'credentials.json');

vi.mock('keytar', () => {
  throw new Error('keytar not available');
});

describe('Keyring (file fallback)', () => {
  let savedContent: string | null = null;

  beforeEach(() => {
    try {
      savedContent = existsSync(CREDENTIALS_FILE) ? readFileSync(CREDENTIALS_FILE, 'utf8') : null;
    } catch {
      savedContent = null;
    }
  });

  afterEach(() => {
    if (savedContent !== null) {
      writeFileSync(CREDENTIALS_FILE, savedContent, 'utf8');
    } else {
      try {
        unlinkSync(CREDENTIALS_FILE);
      } catch {}
    }
  });

  it('should store and retrieve API key via file fallback', async () => {
    const { setAPIKey, getAPIKey } = await import('./keyring.js');
    await setAPIKey('test-file-key', 'default');
    const key = await getAPIKey('default');
    expect(key).toBe('test-file-key');
  });

  it('should use key without suffix for default profile', async () => {
    const { setAPIKey } = await import('./keyring.js');
    await setAPIKey('default-key', 'default');
    const creds = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8'));
    expect(creds['api-key']).toBe('default-key');
  });

  it('should add profile suffix for non-default profiles', async () => {
    const { setAPIKey } = await import('./keyring.js');
    await setAPIKey('staging-key', 'staging');
    const creds = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8'));
    expect(creds['api-key-staging']).toBe('staging-key');
  });

  it('should keep keys separate by profile', async () => {
    const { setAPIKey, getAPIKey } = await import('./keyring.js');
    await setAPIKey('dev-key', 'dev');
    await setAPIKey('prod-key', 'prod');
    expect(await getAPIKey('dev')).toBe('dev-key');
    expect(await getAPIKey('prod')).toBe('prod-key');
  });

  it('should delete keys', async () => {
    const { setAPIKey, getAPIKey, deleteAPIKey } = await import('./keyring.js');
    await setAPIKey('delete-me', 'temp');
    expect(await getAPIKey('temp')).toBe('delete-me');
    await deleteAPIKey('temp');
    expect(await getAPIKey('temp')).toBeNull();
  });

  it('should return null for non-existent keys', async () => {
    const { getAPIKey } = await import('./keyring.js');
    const key = await getAPIKey('nonexistent-profile-xyz');
    expect(key).toBeNull();
  });

  it('should set file permissions to 600', async () => {
    const { setAPIKey } = await import('./keyring.js');
    await setAPIKey('perm-test', 'default');
    const { statSync } = await import('fs');
    const stats = statSync(CREDENTIALS_FILE);
    const mode = (stats.mode & 0o777).toString(8);
    expect(mode).toBe('600');
  });
});

describe('OAuth token keyring', () => {
  let savedContent: string | null = null;

  beforeEach(() => {
    try {
      savedContent = existsSync(CREDENTIALS_FILE) ? readFileSync(CREDENTIALS_FILE, 'utf8') : null;
    } catch {
      savedContent = null;
    }
  });

  afterEach(() => {
    if (savedContent !== null) {
      writeFileSync(CREDENTIALS_FILE, savedContent, 'utf8');
    } else {
      try {
        unlinkSync(CREDENTIALS_FILE);
      } catch {}
    }
  });

  it('stores and retrieves an OAuth token', async () => {
    const { setOAuthToken, getOAuthToken } = await import('./keyring.js');
    await setOAuthToken('test-jwt-token', 'oauth-test-profile');
    const token = await getOAuthToken('oauth-test-profile');
    expect(token).toBe('test-jwt-token');
  });

  it('returns null for missing OAuth token', async () => {
    const { getOAuthToken } = await import('./keyring.js');
    const token = await getOAuthToken('nonexistent-oauth-profile');
    expect(token).toBeNull();
  });

  it('deletes an OAuth token', async () => {
    const { setOAuthToken, getOAuthToken, deleteOAuthToken } = await import('./keyring.js');
    await setOAuthToken('test-jwt-token', 'oauth-delete-test');
    await deleteOAuthToken('oauth-delete-test');
    const token = await getOAuthToken('oauth-delete-test');
    expect(token).toBeNull();
  });
});
