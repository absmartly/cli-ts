import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import type { CustomSectionField } from '../../api-client/types.js';

const CACHE_FILE = join(homedir(), '.config', 'absmartly', 'custom-fields-cache.json');

interface CacheEntry {
  fields: CustomSectionField[];
  cachedAt: number;
}

type CacheData = Record<string, CacheEntry>;

function cacheKey(profile: string, type: string): string {
  return `${profile}:${type}`;
}

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
      `Warning: could not write custom fields cache: ${e instanceof Error ? e.message : e}`
    );
  }
}

export function loadCachedFields(profile: string, type: string): CustomSectionField[] {
  const cache = readCache();
  const entry = cache[cacheKey(profile, type)];
  if (!entry) return [];
  return entry.fields;
}

export function loadAllCachedFields(type: string): CustomSectionField[] {
  const cache = readCache();
  const seen = new Set<string>();
  const result: CustomSectionField[] = [];
  for (const [key, entry] of Object.entries(cache)) {
    if (!key.endsWith(`:${type}`)) continue;
    for (const field of entry.fields) {
      const title = (field as { title?: string }).title ?? field.name ?? '';
      if (!title || seen.has(title.toLowerCase())) continue;
      seen.add(title.toLowerCase());
      result.push(field);
    }
  }
  return result;
}

export function saveCachedFields(
  profile: string,
  type: string,
  fields: CustomSectionField[]
): void {
  const cache = readCache();
  cache[cacheKey(profile, type)] = { fields, cachedAt: Date.now() };
  writeCache(cache);
}
