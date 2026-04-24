import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { unlinkSync, writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import yaml from 'js-yaml';

const fakeHome = mkdtempSync(join(tmpdir(), 'abs-config-merge-test-'));
vi.mock('os', async (importOriginal) => {
  const mod = await importOriginal<typeof import('os')>();
  return { ...mod, homedir: () => fakeHome };
});

import { loadConfig, getConfigPath, ensureConfigDir } from './config.js';

describe('Profile Deep Merge', () => {
  const testConfigPath = getConfigPath();

  beforeEach(() => {
    ensureConfigDir();
  });

  afterEach(() => {
    try {
      unlinkSync(testConfigPath);
    } catch {}
  });

  it('should deep merge user profile with default profile', () => {
    const userConfig = {
      'default-profile': 'default',
      'analytics-opt-out': false,
      output: 'json',
      profiles: {
        default: {
          api: {
            endpoint: 'https://custom-api.example.com',
            token: 'custom-token',
          },
        },
      },
    };

    const configYaml = yaml.dump(userConfig);
    writeFileSync(testConfigPath, configYaml);

    const loaded = loadConfig();

    expect(loaded.profiles.default.api.endpoint).toBe('https://custom-api.example.com');
    expect(loaded.profiles.default.api.token).toBe('custom-token');
    expect(loaded.profiles.default.expctld.endpoint).toBe('');
  });

  it('should preserve expctld endpoint when only api is overridden', () => {
    const userConfig = {
      'default-profile': 'default',
      'analytics-opt-out': false,
      output: 'table',
      profiles: {
        default: {
          api: {
            endpoint: 'https://my-api.com/v1',
          },
        },
      },
    };

    const configYaml = yaml.dump(userConfig);
    writeFileSync(testConfigPath, configYaml);

    const loaded = loadConfig();

    expect(loaded.profiles.default.api.endpoint).toBe('https://my-api.com/v1');
    expect(loaded.profiles.default.expctld.endpoint).toBe('');
  });

  it('should merge both api and expctld when both are provided', () => {
    const userConfig = {
      'default-profile': 'default',
      'analytics-opt-out': false,
      output: 'table',
      profiles: {
        default: {
          api: {
            endpoint: 'https://my-api.com/v1',
            token: 'api-token',
          },
          expctld: {
            endpoint: 'https://my-ctl.com/v1',
            token: 'ctl-token',
          },
        },
      },
    };

    const configYaml = yaml.dump(userConfig);
    writeFileSync(testConfigPath, configYaml);

    const loaded = loadConfig();

    expect(loaded.profiles.default.api.endpoint).toBe('https://my-api.com/v1');
    expect(loaded.profiles.default.api.token).toBe('api-token');
    expect(loaded.profiles.default.expctld.endpoint).toBe('https://my-ctl.com/v1');
    expect(loaded.profiles.default.expctld.token).toBe('ctl-token');
  });

  it('should preserve application and environment when provided', () => {
    const userConfig = {
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
          application: 'my-app',
          environment: 'production',
        },
      },
    };

    const configYaml = yaml.dump(userConfig);
    writeFileSync(testConfigPath, configYaml);

    const loaded = loadConfig();

    expect(loaded.profiles.default.application).toBe('my-app');
    expect(loaded.profiles.default.environment).toBe('production');
  });

  it('should handle new profiles that are not in defaults', () => {
    const userConfig = {
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
        staging: {
          api: {
            endpoint: 'https://staging-api.example.com',
          },
          expctld: {
            endpoint: 'https://staging-ctl.example.com',
          },
          application: 'staging-app',
        },
      },
    };

    const configYaml = yaml.dump(userConfig);
    writeFileSync(testConfigPath, configYaml);

    const loaded = loadConfig();

    expect(loaded.profiles.staging).toBeDefined();
    expect(loaded.profiles.staging.api.endpoint).toBe('https://staging-api.example.com');
    expect(loaded.profiles.staging.expctld.endpoint).toBe('https://staging-ctl.example.com');
    expect(loaded.profiles.staging.application).toBe('staging-app');
  });

  it('should not lose expctld when only api token is set', () => {
    const userConfig = {
      'default-profile': 'default',
      'analytics-opt-out': false,
      output: 'table',
      profiles: {
        default: {
          api: {
            token: 'only-token',
          },
        },
      },
    };

    const configYaml = yaml.dump(userConfig);
    writeFileSync(testConfigPath, configYaml);

    const loaded = loadConfig();

    expect(loaded.profiles.default.api.endpoint).toBe('');
    expect(loaded.profiles.default.api.token).toBe('only-token');
    expect(loaded.profiles.default.expctld.endpoint).toBe('');
    expect(loaded.profiles.default.expctld.token).toBeUndefined();
  });
});
