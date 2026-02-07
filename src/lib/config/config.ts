import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import yaml from 'js-yaml';

export const DEFAULT_CONFIG_DIR = '.config/absmartly';
export const DEFAULT_CONFIG_FILE = 'config.yaml';

export interface APIConfig {
  endpoint: string;
  token?: string;
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
    mkdirSync(dir, { recursive: true, mode: 0o755 });
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
          endpoint: 'https://api.absmartly.com/v1',
        },
        expctld: {
          endpoint: 'https://ctl.absmartly.io/v1',
        },
      },
    },
  };
}

export function loadConfig(): Config {
  const path = getConfigPath();

  if (!existsSync(path)) {
    return defaultConfig();
  }

  try {
    const content = readFileSync(path, 'utf8');
    const config = yaml.load(content) as Config;
    const defaults = defaultConfig();
    return {
      ...defaults,
      ...config,
      profiles: { ...defaults.profiles, ...(config.profiles || {}) },
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('EACCES')) {
        throw new Error(
          `Permission denied reading config file: ${path}\n` +
          `Run: chmod 600 ${path}`
        );
      }
      if (error.message.includes('YAMLException') || error.name === 'YAMLException') {
        throw new Error(
          `Invalid YAML syntax in config file: ${path}\n` +
          `${error.message}\n` +
          `Please fix the syntax or delete the file to reset to defaults.`
        );
      }
    }
    throw new Error(`Failed to load config from ${path}: ${error instanceof Error ? error.message : error}`);
  }
}

export function saveConfig(config: Config): void {
  try {
    ensureConfigDir();
    const path = getConfigPath();
    const content = yaml.dump(config, { indent: 2, lineWidth: 120 });
    writeFileSync(path, content, { encoding: 'utf8', mode: 0o600 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ENOSPC')) {
        throw new Error(
          `Disk full - cannot save config file.\n` +
          `Please free up disk space and try again.`
        );
      }
      if (error.message.includes('EACCES')) {
        throw new Error(
          `Permission denied writing config file: ${getConfigPath()}\n` +
          `Run: chmod u+w ${getConfigDir()}`
        );
      }
    }
    throw new Error(
      `Failed to save config to ${getConfigPath()}: ${error instanceof Error ? error.message : error}\n` +
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
  delete config.profiles[name];

  if (config['default-profile'] === name) {
    const remaining = Object.keys(config.profiles);
    config['default-profile'] = remaining.length > 0 ? remaining[0]! : 'default';
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
  (config as unknown as Record<string, unknown>)[key] = value;
  saveConfig(config);
}

export function unsetConfigValue(key: string): void {
  validateConfigKey(key);
  const config = loadConfig();
  delete (config as unknown as Record<string, unknown>)[key];
  saveConfig(config);
}
