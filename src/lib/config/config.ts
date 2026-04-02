import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'fs';
import yaml from 'js-yaml';

export const DEFAULT_CONFIG_DIR = '.config/absmartly';
export const DEFAULT_CONFIG_FILE = 'config.yaml';

export interface APIConfig {
  endpoint: string;
  token?: string;
  'auth-method'?: 'api-key' | 'oauth-jwt';
  insecure?: boolean;
}

export interface ExpctldConfig {
  endpoint: string;
  token?: string;
}

export interface Profile {
  api: APIConfig;
  expctld: ExpctldConfig;
  application?: string;
  environment?: string;
}

export interface Config {
  'default-profile': string;
  'analytics-opt-out': boolean;
  output: string;
  profiles: Record<string, Profile>;
}

export function getConfigDir(): string {
  return join(homedir(), DEFAULT_CONFIG_DIR);
}

export function getConfigPath(): string {
  return join(getConfigDir(), DEFAULT_CONFIG_FILE);
}

export function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

export function defaultConfig(): Config {
  return {
    'default-profile': 'default',
    'analytics-opt-out': false,
    output: 'table',
    profiles: {
      default: {
        api: {
          endpoint: '',
        },
        expctld: {
          endpoint: '',
        },
      },
    },
  };
}

function deepMergeProfiles(
  defaultProfiles: Record<string, Profile>,
  userProfiles: Record<string, Profile> | undefined
): Record<string, Profile> {
  const result = { ...defaultProfiles };

  if (!userProfiles) return result;

  for (const [name, userProfile] of Object.entries(userProfiles)) {
    const defaultProfile = defaultProfiles[name];

    if (defaultProfile) {
      const merged: Profile = {
        api: { ...defaultProfile.api, ...userProfile.api },
        expctld: { ...defaultProfile.expctld, ...userProfile.expctld },
      };

      if (userProfile.application !== undefined) {
        merged.application = userProfile.application;
      } else if (defaultProfile.application !== undefined) {
        merged.application = defaultProfile.application;
      }

      if (userProfile.environment !== undefined) {
        merged.environment = userProfile.environment;
      } else if (defaultProfile.environment !== undefined) {
        merged.environment = defaultProfile.environment;
      }

      result[name] = merged;
    } else {
      result[name] = userProfile;
    }
  }

  return result;
}

export function loadConfig(): Config {
  const path = getConfigPath();

  try {
    const content = readFileSync(path, 'utf8');
    const config = yaml.load(content);

    if (!config || typeof config !== 'object') {
      console.warn(`Warning: Empty or invalid config file at ${path}, using defaults`);
      return defaultConfig();
    }

    const validConfig = config as Config;
    const defaults = defaultConfig();
    return {
      ...defaults,
      ...validConfig,
      profiles: deepMergeProfiles(defaults.profiles, validConfig.profiles),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return defaultConfig();
    }
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(
        `Permission denied reading config file: ${path}\n` +
        `Run: chmod 600 ${path}`
      );
    }
    if (error instanceof Error && error.name === 'YAMLException') {
      throw new Error(
        `Invalid YAML syntax in config file: ${path}\n` +
        `${error.message}\n` +
        `Please fix the syntax or delete the file to reset to defaults.`
      );
    }
    throw new Error(`Failed to load config from ${path}: ${error instanceof Error ? error.message : error}`);
  }
}

export function saveConfig(config: Config): void {
  const path = getConfigPath();
  const tempPath = `${path}.tmp.${process.pid}`;

  try {
    ensureConfigDir();
    const content = yaml.dump(config, { indent: 2, lineWidth: 120 });

    writeFileSync(tempPath, content, { encoding: 'utf8', mode: 0o600 });

    ensureConfigDir();
    renameSync(tempPath, path);

  } catch (error) {
    try {
      unlinkSync(tempPath);
    } catch (cleanupErr) {
      if (process.env.DEBUG) console.error(`Warning: Could not clean up temp file ${tempPath}: ${cleanupErr instanceof Error ? cleanupErr.message : cleanupErr}`);
    }

    if (error instanceof Error) {
      if (error.message.includes('ENOSPC')) {
        throw new Error(
          `Disk full - cannot save config file.\n` +
          `Please free up disk space and try again.`
        );
      }
      if (error.message.includes('EACCES')) {
        throw new Error(
          `Permission denied writing config file: ${path}\n` +
          `Run: chmod u+w ${getConfigDir()}`
        );
      }
    }
    throw new Error(
      `Failed to save config to ${path}: ${error instanceof Error ? error.message : error}\n` +
      `Please check file permissions and available disk space.`
    );
  }
}

export function getProfile(profileName?: string): Profile {
  const config = loadConfig();
  const name = profileName ?? config['default-profile'];

  const profile = config.profiles[name];
  if (!profile) {
    throw new Error(`Profile "${name}" not found`);
  }

  return profile;
}

export function setProfile(name: string, profile: Profile): void {
  const config = loadConfig();
  config.profiles[name] = profile;
  saveConfig(config);
}

export function deleteProfile(name: string): void {
  const config = loadConfig();

  const profileNames = Object.keys(config.profiles);
  if (profileNames.length === 1 && profileNames[0] === name) {
    throw new Error(
      `Cannot delete the only remaining profile: ${name}\n` +
      `Create another profile first, then delete this one.`
    );
  }

  delete config.profiles[name];

  if (config['default-profile'] === name) {
    const remaining = Object.keys(config.profiles);
    if (remaining.length === 0) {
      // This should be unreachable due to check above, but be safe
      throw new Error('Cannot delete last profile');
    }
    config['default-profile'] = remaining[0]!;
    console.log(`Default profile switched to: ${remaining[0]}`);
  }

  saveConfig(config);
}

export function setDefaultProfile(name: string): void {
  const config = loadConfig();
  if (!config.profiles[name]) {
    throw new Error(`Profile "${name}" not found`);
  }
  config['default-profile'] = name;
  saveConfig(config);
}

export function listProfiles(): string[] {
  const config = loadConfig();
  return Object.keys(config.profiles);
}

const ALLOWED_CONFIG_KEYS = ['output', 'analytics-opt-out', 'default-profile'] as const;
type AllowedConfigKey = typeof ALLOWED_CONFIG_KEYS[number];

function validateConfigKey(key: string): asserts key is AllowedConfigKey {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    throw new Error(`Cannot set protected key: ${key}`);
  }
  if (!ALLOWED_CONFIG_KEYS.includes(key as AllowedConfigKey)) {
    throw new Error(
      `Invalid config key: '${key}'. Allowed keys: ${ALLOWED_CONFIG_KEYS.join(', ')}`
    );
  }
}

export function getConfigValue(key: string): string | boolean | undefined {
  validateConfigKey(key);
  const config = loadConfig();
  return (config as unknown as Record<string, unknown>)[key] as string | boolean | undefined;
}

export function setConfigValue(key: string, value: string | boolean): void {
  validateConfigKey(key);
  const config = loadConfig();

  let finalValue: string | boolean = value;
  if (key === 'analytics-opt-out' && typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      finalValue = true;
    } else if (['false', '0', 'no'].includes(normalized)) {
      finalValue = false;
    } else {
      throw new Error(
        `Invalid boolean value for ${key}: "${value}"\n` +
        `Use: true, false, 1, 0, yes, or no`
      );
    }
  }

  (config as unknown as Record<string, unknown>)[key] = finalValue;
  saveConfig(config);
}

export function unsetConfigValue(key: string): void {
  validateConfigKey(key);
  const config = loadConfig();
  delete (config as unknown as Record<string, unknown>)[key];
  saveConfig(config);
}
