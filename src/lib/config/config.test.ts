import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unlinkSync, existsSync } from 'fs';
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
} from './config.js';

describe('Config Management', () => {
  const testConfigPath = getConfigPath();

  afterEach(() => {
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe('defaultConfig', () => {
    it('should create default configuration', () => {
      const config = defaultConfig();
      expect(config['default-profile']).toBe('default');
      expect(config.output).toBe('table');
      expect(config.profiles.default).toBeDefined();
      expect(config.profiles.default.api.endpoint).toBe('https://api.absmartly.com/v1');
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
      expect(loaded.profiles['default'].api.endpoint).toBe('https://api.absmartly.com/v1');
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
      expect(loaded.profiles['default'].api.endpoint).toBe('https://api.absmartly.com/v1');
      expect(loaded.profiles['default'].expctld.endpoint).toBe('https://ctl.absmartly.io/v1');
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
      expect(loaded.profiles['default'].api.endpoint).toBe('https://api.absmartly.com/v1');
    });

    it('should handle missing profiles key', () => {
      const userConfig = {
        'default-profile': 'default',
        output: 'yaml',
      };
      saveConfig(userConfig as any);

      const loaded = loadConfig();
      expect(loaded.profiles['default']).toBeDefined();
      expect(loaded.profiles['default'].api.endpoint).toBe('https://api.absmartly.com/v1');
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
      expect(profile.api.endpoint).toBe('https://api.absmartly.com/v1');
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
});
