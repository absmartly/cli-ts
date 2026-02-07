import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unlinkSync, existsSync } from 'fs';
import {
  getConfigValue,
  setConfigValue,
  unsetConfigValue,
  saveConfig,
  defaultConfig,
  getConfigPath,
} from './config.js';

describe('Config Key Validation', () => {
  const testConfigPath = getConfigPath();

  beforeEach(() => {
    const config = defaultConfig();
    saveConfig(config);
  });

  afterEach(() => {
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe('validateConfigKey - prototype pollution protection', () => {
    it('should block __proto__ key in setConfigValue', () => {
      expect(() => setConfigValue('__proto__', 'malicious')).toThrow(
        'Cannot set protected key: __proto__'
      );
    });

    it('should block constructor key in setConfigValue', () => {
      expect(() => setConfigValue('constructor', 'malicious')).toThrow(
        'Cannot set protected key: constructor'
      );
    });

    it('should block prototype key in setConfigValue', () => {
      expect(() => setConfigValue('prototype', 'malicious')).toThrow(
        'Cannot set protected key: prototype'
      );
    });

    it('should block __proto__ key in getConfigValue', () => {
      expect(() => getConfigValue('__proto__')).toThrow(
        'Cannot set protected key: __proto__'
      );
    });

    it('should block __proto__ key in unsetConfigValue', () => {
      expect(() => unsetConfigValue('__proto__')).toThrow(
        'Cannot set protected key: __proto__'
      );
    });
  });

  describe('validateConfigKey - allowed keys', () => {
    it('should allow setting output key', () => {
      expect(() => setConfigValue('output', 'json')).not.toThrow();
      expect(getConfigValue('output')).toBe('json');
    });

    it('should allow setting analytics-opt-out key', () => {
      expect(() => setConfigValue('analytics-opt-out', true)).not.toThrow();
      expect(getConfigValue('analytics-opt-out')).toBe(true);
    });

    it('should allow setting default-profile key', () => {
      expect(() => setConfigValue('default-profile', 'production')).not.toThrow();
      expect(getConfigValue('default-profile')).toBe('production');
    });

    it('should allow unsetting output key', () => {
      setConfigValue('output', 'yaml');
      expect(() => unsetConfigValue('output')).not.toThrow();
    });

    it('should allow getting output key', () => {
      setConfigValue('output', 'markdown');
      expect(getConfigValue('output')).toBe('markdown');
    });
  });

  describe('validateConfigKey - unknown keys', () => {
    it('should reject unknown key with helpful error message', () => {
      expect(() => setConfigValue('unknown-key', 'value')).toThrow(
        /Invalid config key: 'unknown-key'\. Allowed keys: output, analytics-opt-out, default-profile/
      );
    });

    it('should reject arbitrary key', () => {
      expect(() => setConfigValue('malicious', 'payload')).toThrow(
        /Invalid config key: 'malicious'/
      );
    });

    it('should list all allowed keys in error message', () => {
      try {
        setConfigValue('bad-key', 'value');
        throw new Error('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('output');
        expect((error as Error).message).toContain('analytics-opt-out');
        expect((error as Error).message).toContain('default-profile');
      }
    });
  });

  describe('validateConfigKey - edge cases', () => {
    it('should handle empty string key', () => {
      expect(() => setConfigValue('', 'value')).toThrow(/Invalid config key/);
    });

    it('should be case-sensitive for keys', () => {
      expect(() => setConfigValue('OUTPUT', 'json')).toThrow(/Invalid config key: 'OUTPUT'/);
    });

    it('should not allow keys with extra whitespace', () => {
      expect(() => setConfigValue(' output ', 'json')).toThrow(/Invalid config key: ' output '/);
    });
  });
});
