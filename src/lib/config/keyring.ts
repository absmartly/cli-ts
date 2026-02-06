import keytar from 'keytar';

const SERVICE_NAME = 'absmartly-cli';

export interface KeyringOptions {
  profile?: string;
}

function getKeyName(key: string, profile?: string): string {
  const profileSuffix = profile && profile !== 'default' ? `-${profile}` : '';
  return `${key}${profileSuffix}`;
}

export async function setPassword(
  key: string,
  value: string,
  options: KeyringOptions = {}
): Promise<void> {
  const keyName = getKeyName(key, options.profile);
  await keytar.setPassword(SERVICE_NAME, keyName, value);
}

export async function getPassword(
  key: string,
  options: KeyringOptions = {}
): Promise<string | null> {
  const keyName = getKeyName(key, options.profile);
  return await keytar.getPassword(SERVICE_NAME, keyName);
}

export async function deletePassword(
  key: string,
  options: KeyringOptions = {}
): Promise<boolean> {
  const keyName = getKeyName(key, options.profile);
  return await keytar.deletePassword(SERVICE_NAME, keyName);
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
