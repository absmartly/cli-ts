import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const CACHE_FILE = join(homedir(), '.config', 'absmartly', 'action-dialog-cache.json');

export interface ActionDialogField {
  id: number;
  type: string;
  subtitle: string;
  description: string | null;
  placeholder: string | null;
  default_value: string | null;
  required: boolean;
  action_type: string;
  order_index: number;
}

interface CacheEntry {
  fields: ActionDialogField[];
  cachedAt: number;
}

type CacheData = Record<string, CacheEntry>;

function readCache(): CacheData {
  if (!existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  } catch (e) {
    console.error('');
    console.error(`[absmartly] WARNING: Cache file is corrupted and could not be parsed.`);
    console.error(`  File: ${CACHE_FILE}`);
    console.error(`  Error: ${e instanceof Error ? e.message : e}`);
    console.error(`  To fix: delete the file and refresh the cache:`);
    console.error(`    rm "${CACHE_FILE}"`);
    console.error(`    abs experiments refresh-fields`);
    console.error('');
    return {};
  }
}

function writeCache(data: CacheData): void {
  try {
    const dir = join(homedir(), '.config', 'absmartly');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
  } catch (e) {
    console.error(
      `Warning: could not write action dialog cache: ${e instanceof Error ? e.message : e}`
    );
  }
}

export function loadCachedActionDialogFields(profile: string): ActionDialogField[] {
  const cache = readCache();
  return cache[profile]?.fields ?? [];
}

export function saveCachedActionDialogFields(profile: string, fields: ActionDialogField[]): void {
  const cache = readCache();
  cache[profile] = { fields, cachedAt: Date.now() };
  writeCache(cache);
}

export function getActionDialogField(
  profile: string,
  actionType: string,
  experimentType: string
): ActionDialogField | undefined {
  const fields = loadCachedActionDialogFields(profile);
  return fields.find((f) => f.action_type === actionType && f.type === experimentType);
}
