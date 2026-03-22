import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs';

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
  } catch {
    keytarModule = false;
    return null;
  }
}

function readCredentialsFile(): Record<string, string> {
  try {
    if (!existsSync(CREDENTIALS_FILE)) return {};
    return JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeCredentialsFile(data: Record<string, string>): void {
  const dir = join(homedir(), '.config', 'absmartly');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2), 'utf8');
  try { chmodSync(CREDENTIALS_FILE, 0o600); } catch { /* best effort */ }
}

export async function setPassword(
  key: string,
  value: string,
  options: KeyringOptions = {}
): Promise<void> {
  const keyName = getKeyName(key, options.profile);
  const keytar = await getKeytar();
  if (keytar) {
    await keytar.setPassword(SERVICE_NAME, keyName, value);
    return;
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
    return await keytar.getPassword(SERVICE_NAME, keyName);
  }
  const creds = readCredentialsFile();
  return creds[keyName] ?? null;
}

export async function deletePassword(
  key: string,
  options: KeyringOptions = {}
): Promise<boolean> {
  const keyName = getKeyName(key, options.profile);
  const keytar = await getKeytar();
  if (keytar) {
    return await keytar.deletePassword(SERVICE_NAME, keyName);
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
