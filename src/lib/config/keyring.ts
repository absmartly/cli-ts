import keytar from 'keytar';

const SERVICE_NAME = 'absmartly-cli';

export interface KeyringOptions {
  profile?: string;
}

function getKeyName(key: string, profile?: string): string {
  const profileSuffix = profile && profile !== 'default' ? `-${profile}` : '';
  return `${key}${profileSuffix}`;
}

function keyringError(action: string, key: string, profile: string | undefined, error: unknown): Error {
  const profileInfo = profile ? ` for profile "${profile}"` : '';
  const errorMsg = error instanceof Error ? error.message : 'unknown error';
  return new Error(
    `Failed to ${action} "${key}"${profileInfo} ${action === 'save' ? 'to' : 'from'} system keychain: ${errorMsg}\n` +
    `Please ensure your system keychain is unlocked and accessible.`
  );
}

export async function setPassword(
  key: string,
  value: string,
  options: KeyringOptions = {}
): Promise<void> {
  try {
    const keyName = getKeyName(key, options.profile);
    await keytar.setPassword(SERVICE_NAME, keyName, value);
  } catch (error) {
    throw keyringError('save', key, options.profile, error);
  }
}

export async function getPassword(
  key: string,
  options: KeyringOptions = {}
): Promise<string | null> {
  try {
    const keyName = getKeyName(key, options.profile);
    return await keytar.getPassword(SERVICE_NAME, keyName);
  } catch (error) {
    throw keyringError('read', key, options.profile, error);
  }
}

export async function deletePassword(
  key: string,
  options: KeyringOptions = {}
): Promise<boolean> {
  try {
    const keyName = getKeyName(key, options.profile);
    return await keytar.deletePassword(SERVICE_NAME, keyName);
  } catch (error) {
    throw keyringError('delete', key, options.profile, error);
  }
}

export async function setAPIKey(apiKey: string, profile?: string): Promise<void> {
  await setPassword('api-key', apiKey, { profile });
}

export async function getAPIKey(profile?: string): Promise<string | null> {
  return await getPassword('api-key', { profile });
}

export async function deleteAPIKey(profile?: string): Promise<boolean> {
  return await deletePassword('api-key', { profile });
}
