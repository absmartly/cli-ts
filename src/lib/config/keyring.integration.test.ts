import { describe, it, expect, afterAll } from 'vitest';
import { setPassword, getPassword, deletePassword } from './keyring.js';

const TEST_KEY = '__keyring-integration-test__';
const TEST_VALUE = `test-value-${Date.now()}`;

describe('Keyring integration (real backend)', () => {
  afterAll(async () => {
    await deletePassword(TEST_KEY);
  });

  it('round-trips set/get/delete through whichever backend is available', async () => {
    await setPassword(TEST_KEY, TEST_VALUE);
    const retrieved = await getPassword(TEST_KEY);
    expect(retrieved).toBe(TEST_VALUE);

    const deleted = await deletePassword(TEST_KEY);
    expect(deleted).toBe(true);

    const afterDelete = await getPassword(TEST_KEY);
    expect(afterDelete).toBeNull();
  });

  it('returns null for a key that was never set', async () => {
    const result = await getPassword('__nonexistent-key-xyz__');
    expect(result).toBeNull();
  });

  it('delete returns false for a key that does not exist', async () => {
    const result = await deletePassword('__nonexistent-key-xyz__');
    expect(result).toBe(false);
  });
});
