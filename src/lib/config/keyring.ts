import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const SERVICE_NAME = 'absmartly-cli';
const CREDENTIALS_FILE = join(homedir(), '.config', 'absmartly', 'credentials.json');

export interface KeyringOptions {
  profile?: string;
}

function getKeyName(key: string, profile?: string): string {
  const profileSuffix = profile && profile !== 'default' ? `-${profile}` : '';
  return `${key}${profileSuffix}`;
}

let keytarModule: typeof import('keytar') | null | false = null;

async function getKeytar(): Promise<typeof import('keytar') | null> {
  if (keytarModule === false) return null;
  if (keytarModule !== null) return keytarModule;
  try {
    const mod = await import('keytar');
    const kt = mod.default ?? mod;
    if (typeof kt.getPassword !== 'function') throw new Error('keytar not usable');
    await kt.getPassword(SERVICE_NAME, '__probe__');
    keytarModule = kt as typeof import('keytar');
    return keytarModule;
  } catch (e) {
    keytarModule = false;
    const reason = e instanceof Error ? e.message : String(e);
    console.error(
      `Warning: OS keyring unavailable (${reason}), credentials will be stored in ${CREDENTIALS_FILE}`
    );
    return null;
  }
}

function readCredentialsFile(): Record<string, string> {
  if (!existsSync(CREDENTIALS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8'));
  } catch {
    throw new Error(
      `Credentials file is corrupted: ${CREDENTIALS_FILE}\nBack up this file and run: abs auth login`
    );
  }
}

function writeCredentialsFile(data: Record<string, string>): void {
  const dir = join(homedir(), '.config', 'absmartly');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
  } catch (e) {
    throw new Error(
      `Could not write credentials file ${CREDENTIALS_FILE}: ${e instanceof Error ? e.message : e}`
    );
  }
}

export async function setPassword(
  key: string,
  value: string,
  options: KeyringOptions = {}
): Promise<void> {
  const keyName = getKeyName(key, options.profile);
  const keytar = await getKeytar();
  if (keytar) {
    try {
      await keytar.setPassword(SERVICE_NAME, keyName, value);
      return;
    } catch (e) {
      console.error(
        `Warning: could not save to OS keyring (${e instanceof Error ? e.message : e}), falling back to file storage`
      );
    }
  }
  const creds = readCredentialsFile();
  creds[keyName] = value;
  writeCredentialsFile(creds);
}

export async function getPassword(
  key: string,
  options: KeyringOptions = {}
): Promise<string | null> {
  const keyName = getKeyName(key, options.profile);
  const keytar = await getKeytar();
  if (keytar) {
    try {
      return await keytar.getPassword(SERVICE_NAME, keyName);
    } catch (e) {
      console.error(
        `Warning: could not read from OS keyring (${e instanceof Error ? e.message : e}), checking file storage`
      );
    }
  }
  const creds = readCredentialsFile();
  return creds[keyName] ?? null;
}

export async function deletePassword(key: string, options: KeyringOptions = {}): Promise<boolean> {
  const keyName = getKeyName(key, options.profile);
  const keytar = await getKeytar();
  if (keytar) {
    try {
      return await keytar.deletePassword(SERVICE_NAME, keyName);
    } catch (e) {
      console.error(
        `Warning: could not delete from OS keyring (${e instanceof Error ? e.message : e}), checking file storage`
      );
    }
  }
  const creds = readCredentialsFile();
  if (keyName in creds) {
    delete creds[keyName];
    writeCredentialsFile(creds);
    return true;
  }
  return false;
}

export async function setAPIKey(apiKey: string, profile?: string): Promise<void> {
  await setPassword('api-key', apiKey, profile ? { profile } : {});
}

export async function getAPIKey(profile?: string): Promise<string | null> {
  return await getPassword('api-key', profile ? { profile } : {});
}

export async function deleteAPIKey(profile?: string): Promise<boolean> {
  return await deletePassword('api-key', profile ? { profile } : {});
}

export async function setOAuthToken(token: string, profile?: string): Promise<void> {
  await setPassword('oauth-token', token, profile ? { profile } : {});
}

export async function getOAuthToken(profile?: string): Promise<string | null> {
  return await getPassword('oauth-token', profile ? { profile } : {});
}

export async function deleteOAuthToken(profile?: string): Promise<boolean> {
  return await deletePassword('oauth-token', profile ? { profile } : {});
}
