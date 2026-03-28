import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { unlinkSync, existsSync, writeFileSync, readdirSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const fakeHome = mkdtempSync(join(tmpdir(), 'abs-config-test-'));
vi.mock('os', async (importOriginal) => {
  const mod = await importOriginal<typeof import('os')>();
  return { ...mod, homedir: () => fakeHome };
});

import {
  defaultConfig,
  loadConfig,
  saveConfig,
  getProfile,
  setProfile,
  deleteProfile,
  setDefaultProfile,
  listProfiles,
  getConfigPath,
  ensureConfigDir,
  getConfigDir,
} from './config.js';

describe('Config Management', () => {
  const testConfigPath = getConfigPath();
  const testConfigDir = getConfigDir();

  afterEach(() => {
    try {
      unlinkSync(testConfigPath);
    } catch {}

    try {
      const tempFiles = readdirSync(testConfigDir).filter(f => f.includes('.tmp.'));
      for (const file of tempFiles) {
        try {
          unlinkSync(`${testConfigDir}/${file}`);
        } catch {}
      }
    } catch {}
  });

  describe('defaultConfig', () => {
    it('should create default configuration', () => {
      const config = defaultConfig();
      expect(config['default-profile']).toBe('default');
      expect(config.output).toBe('table');
      expect(config.profiles.default).toBeDefined();
      expect(config.profiles.default.api.endpoint).toBe('');
    });
  });

  describe('saveConfig and loadConfig', () => {
    it('should save and load config', () => {
      const config = defaultConfig();
      saveConfig(config);

      const loaded = loadConfig();
      expect(loaded['default-profile']).toBe('default');
      expect(loaded.profiles.default).toBeDefined();
    });
  });

  describe('loadConfig - deep merge behavior', () => {
    it('should preserve default profile when user config has additional profiles', () => {
      const userConfig = defaultConfig();
      userConfig.profiles['staging'] = {
        api: { endpoint: 'https://staging.com/v1' },
        expctld: { endpoint: 'https://ctl-staging.com/v1' },
      };
      saveConfig(userConfig);

      const loaded = loadConfig();
      expect(loaded.profiles['default']).toBeDefined();
      expect(loaded.profiles['default'].api.endpoint).toBe('');
      expect(loaded.profiles['staging']).toBeDefined();
      expect(loaded.profiles['staging'].api.endpoint).toBe('https://staging.com/v1');
    });

    it('should merge user profiles over defaults', () => {
      ensureConfigDir();
      const userConfig = defaultConfig();
      userConfig.profiles['default'] = {
        api: { endpoint: 'https://custom.com/v1', token: 'custom-token' },
        expctld: { endpoint: 'https://ctl-custom.com/v1' },
      };
      saveConfig(userConfig);

      const loaded = loadConfig();
      expect(loaded.profiles['default'].api.endpoint).toBe('https://custom.com/v1');
      expect(loaded.profiles['default'].api.token).toBe('custom-token');
    });

    it('should not lose nested default values', () => {
      const userConfig = {
        'default-profile': 'custom',
        'analytics-opt-out': true,
        output: 'json',
        profiles: {
          custom: {
            api: { endpoint: 'https://custom.com/v1' },
            expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
          },
        },
      };
      saveConfig(userConfig as any);

      const loaded = loadConfig();
      expect(loaded.profiles['default']).toBeDefined();
      expect(loaded.profiles['default'].api.endpoint).toBe('');
      expect(loaded.profiles['default'].expctld.endpoint).toBe('');
      expect(loaded.profiles['custom']).toBeDefined();
    });

    it('should handle empty profiles object', () => {
      const userConfig = {
        'default-profile': 'default',
        'analytics-opt-out': false,
        output: 'table',
        profiles: {},
      };
      saveConfig(userConfig as any);

      const loaded = loadConfig();
      expect(loaded.profiles['default']).toBeDefined();
      expect(loaded.profiles['default'].api.endpoint).toBe('');
    });

    it('should handle missing profiles key', () => {
      const userConfig = {
        'default-profile': 'default',
        output: 'yaml',
      };
      saveConfig(userConfig as any);

      const loaded = loadConfig();
      expect(loaded.profiles['default']).toBeDefined();
      expect(loaded.profiles['default'].api.endpoint).toBe('');
    });

    it('should handle config with only top-level keys and preserve defaults', () => {
      const baseConfig = defaultConfig();
      const userConfig = {
        ...baseConfig,
        'default-profile': 'production',
        'analytics-opt-out': true,
      };
      delete userConfig.profiles;
      saveConfig(userConfig as any);

      const loaded = loadConfig();
      expect(loaded['default-profile']).toBe('production');
      expect(loaded['analytics-opt-out']).toBe(true);
      expect(loaded.profiles['default']).toBeDefined();
    });
  });

  describe('profile management', () => {
    beforeEach(() => {
      const config = defaultConfig();
      saveConfig(config);
    });

    it('should get profile', () => {
      const profile = getProfile('default');
      expect(profile).toBeDefined();
      expect(profile.api.endpoint).toBe('');
    });

    it('should set new profile', () => {
      const newProfile = {
        api: { endpoint: 'https://staging.absmartly.com/v1' },
        expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
        application: 'test-app',
      };

      setProfile('staging', newProfile);

      const loaded = getProfile('staging');
      expect(loaded.api.endpoint).toBe('https://staging.absmartly.com/v1');
      expect(loaded.application).toBe('test-app');
    });

    it('should list profiles', () => {
      setProfile('staging', {
        api: { endpoint: 'https://staging.com/v1' },
        expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
      });

      const profiles = listProfiles();
      expect(profiles).toContain('default');
      expect(profiles).toContain('staging');
    });

    it('should set default profile', () => {
      setProfile('prod', {
        api: { endpoint: 'https://prod.com/v1' },
        expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
      });

      setDefaultProfile('prod');

      const config = loadConfig();
      expect(config['default-profile']).toBe('prod');
    });

    it('should delete profile', () => {
      setProfile('temp', {
        api: { endpoint: 'https://temp.com/v1' },
        expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
      });

      deleteProfile('temp');

      const profiles = listProfiles();
      expect(profiles).not.toContain('temp');
    });
  });

  describe('Security: TOCTOU Fix', () => {
    it('should handle missing config file without TOCTOU race', () => {
      if (existsSync(testConfigPath)) {
        unlinkSync(testConfigPath);
      }

      const loaded = loadConfig();
      expect(loaded).toBeDefined();
      expect(loaded['default-profile']).toBe('default');
      expect(loaded.profiles.default).toBeDefined();
    });

    it('should return default config when file does not exist', () => {
      if (existsSync(testConfigPath)) {
        unlinkSync(testConfigPath);
      }

      const loaded = loadConfig();
      const defaults = defaultConfig();

      expect(loaded).toEqual(defaults);
    });

    it('should handle file that appears/disappears between operations', () => {
      const config = defaultConfig();
      saveConfig(config);

      expect(existsSync(testConfigPath)).toBe(true);

      unlinkSync(testConfigPath);

      const loaded = loadConfig();
      expect(loaded).toEqual(defaultConfig());
    });
  });

  describe('Security: Atomic Writes', () => {
    it('should use temp file during write', () => {
      const config = defaultConfig();
      saveConfig(config);

      expect(existsSync(testConfigPath)).toBe(true);

      const tempFiles = readdirSync(testConfigDir).filter(f => f.includes('.tmp.'));
      expect(tempFiles.length).toBe(0);
    });

    it('should not leave temp files after successful write', () => {
      const config = defaultConfig();
      config.output = 'json';

      saveConfig(config);

      const tempFiles = readdirSync(testConfigDir).filter(f => f.includes('.tmp.'));
      expect(tempFiles.length).toBe(0);

      const loaded = loadConfig();
      expect(loaded.output).toBe('json');
    });

    it('should preserve atomicity by using temp file pattern', () => {
      const config1 = defaultConfig();
      config1['default-profile'] = 'profile1';
      saveConfig(config1);

      const config2 = defaultConfig();
      config2['default-profile'] = 'profile2';
      saveConfig(config2);

      const loaded = loadConfig();
      expect(loaded['default-profile']).toBe('profile2');

      const tempFiles = readdirSync(testConfigDir).filter(f => f.includes('.tmp.'));
      expect(tempFiles.length).toBe(0);
    });

    it('should complete atomic rename successfully', () => {
      const config = defaultConfig();
      config['default-profile'] = 'atomic-test';

      saveConfig(config);

      expect(existsSync(testConfigPath)).toBe(true);

      const loaded = loadConfig();
      expect(loaded['default-profile']).toBe('atomic-test');

      const tempFiles = readdirSync(testConfigDir).filter(f => f.includes('.tmp.'));
      expect(tempFiles.length).toBe(0);
    });
  });

  describe('profile auth-method', () => {
    beforeEach(() => {
      const config = defaultConfig();
      saveConfig(config);
    });

    it('stores and retrieves auth-method oauth-jwt', () => {
      const profile = {
        api: { endpoint: 'https://example.com/v1', 'auth-method': 'oauth-jwt' as const },
        expctld: { endpoint: '' },
      };
      setProfile('oauth-config-test', profile);
      const loaded = getProfile('oauth-config-test');
      expect(loaded.api['auth-method']).toBe('oauth-jwt');
    });

    it('has no auth-method by default', () => {
      const profile = getProfile('default');
      expect(profile.api['auth-method']).toBeUndefined();
    });
  });

  describe('Security: Empty YAML Handling', () => {
    it('should handle empty config file', () => {
      ensureConfigDir();
      writeFileSync(testConfigPath, '', 'utf8');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const loaded = loadConfig();

      expect(loaded).toEqual(defaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Empty or invalid config file')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle config file with only whitespace', () => {
      ensureConfigDir();
      writeFileSync(testConfigPath, '   \n\n  \t  \n', 'utf8');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const loaded = loadConfig();

      expect(loaded).toEqual(defaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Empty or invalid config file')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle config file with only comments', () => {
      ensureConfigDir();
      writeFileSync(testConfigPath, '# This is a comment\n# Another comment\n', 'utf8');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const loaded = loadConfig();

      expect(loaded).toEqual(defaultConfig());

      consoleWarnSpy.mockRestore();
    });

    it('should handle config with null value', () => {
      ensureConfigDir();
      writeFileSync(testConfigPath, 'null', 'utf8');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const loaded = loadConfig();

      expect(loaded).toEqual(defaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Empty or invalid config file')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle valid config file normally', () => {
      const config = defaultConfig();
      config.output = 'json';
      saveConfig(config);

      const loaded = loadConfig();

      expect(loaded.output).toBe('json');
      expect(loaded.profiles.default).toBeDefined();
    });
  });
});
