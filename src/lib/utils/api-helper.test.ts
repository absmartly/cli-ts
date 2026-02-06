import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('../config/config', () => ({
  loadConfig: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock('../config/keyring', () => ({
  getAPIKey: vi.fn(),
}));

vi.mock('../api/client', () => ({
  createAPIClient: vi.fn(),
}));

import { getAPIClientFromOptions, getGlobalOptions } from './api-helper.js';
import { loadConfig, getProfile } from '../config/config.js';
import { getAPIKey } from '../config/keyring.js';
import { createAPIClient } from '../api/client.js';

describe('API Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAPIClientFromOptions', () => {
    it('should throw error with helpful message when no API key found', async () => {
      (loadConfig as any).mockReturnValue({
        'default-profile': 'default',
      });
      (getProfile as any).mockReturnValue({
        api: { endpoint: 'https://api.absmartly.com/v1' },
        expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
      });
      (getAPIKey as any).mockResolvedValue(null);

      await expect(getAPIClientFromOptions({})).rejects.toThrow(
        /No API key found for profile "default"/
      );
      await expect(getAPIClientFromOptions({})).rejects.toThrow(
        /abs auth login --api-key/
      );
      await expect(getAPIClientFromOptions({})).rejects.toThrow(
        /abs setup/
      );
    });

    it('should use profile-specific configuration', async () => {
      (loadConfig as any).mockReturnValue({
        'default-profile': 'default',
      });
      (getProfile as any).mockReturnValue({
        api: { endpoint: 'https://staging.api.com/v1' },
        expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
      });
      (getAPIKey as any).mockResolvedValue('staging-key');
      (createAPIClient as any).mockReturnValue({});

      await getAPIClientFromOptions({ profile: 'staging' });

      expect(getProfile).toHaveBeenCalledWith('staging');
      expect(getAPIKey).toHaveBeenCalledWith('staging');
      expect(createAPIClient).toHaveBeenCalledWith(
        'https://staging.api.com/v1',
        'staging-key',
        { verbose: undefined }
      );
    });

    it('should prefer command-line apiKey over profile', async () => {
      (loadConfig as any).mockReturnValue({
        'default-profile': 'default',
      });
      (getProfile as any).mockReturnValue({
        api: { endpoint: 'https://api.absmartly.com/v1' },
        expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
      });
      (getAPIKey as any).mockResolvedValue('profile-key');
      (createAPIClient as any).mockReturnValue({});

      await getAPIClientFromOptions({ apiKey: 'override-key' });

      expect(createAPIClient).toHaveBeenCalledWith(
        'https://api.absmartly.com/v1',
        'override-key',
        expect.any(Object)
      );
    });

    it('should prefer command-line endpoint over profile', async () => {
      (loadConfig as any).mockReturnValue({
        'default-profile': 'default',
      });
      (getProfile as any).mockReturnValue({
        api: { endpoint: 'https://api.absmartly.com/v1' },
        expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
      });
      (getAPIKey as any).mockResolvedValue('test-key');
      (createAPIClient as any).mockReturnValue({});

      await getAPIClientFromOptions({ endpoint: 'https://custom.api.com/v1' });

      expect(createAPIClient).toHaveBeenCalledWith(
        'https://custom.api.com/v1',
        'test-key',
        expect.any(Object)
      );
    });

    it('should pass verbose flag to client', async () => {
      (loadConfig as any).mockReturnValue({
        'default-profile': 'default',
      });
      (getProfile as any).mockReturnValue({
        api: { endpoint: 'https://api.absmartly.com/v1' },
        expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
      });
      (getAPIKey as any).mockResolvedValue('test-key');
      (createAPIClient as any).mockReturnValue({});

      await getAPIClientFromOptions({ verbose: true });

      expect(createAPIClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ verbose: true })
      );
    });

    it('should use default profile when not specified', async () => {
      (loadConfig as any).mockReturnValue({
        'default-profile': 'production',
      });
      (getProfile as any).mockReturnValue({
        api: { endpoint: 'https://api.absmartly.com/v1' },
        expctld: { endpoint: 'https://ctl.absmartly.io/v1' },
      });
      (getAPIKey as any).mockResolvedValue('prod-key');
      (createAPIClient as any).mockReturnValue({});

      await getAPIClientFromOptions({});

      expect(getProfile).toHaveBeenCalledWith('production');
      expect(getAPIKey).toHaveBeenCalledWith('production');
    });
  });

  describe('getGlobalOptions', () => {
    let mockCommand: Command;

    beforeEach(() => {
      mockCommand = new Command();
      mockCommand
        .option('--output <format>', 'output format', 'table')
        .option('--no-color', 'disable colors')
        .option('-v, --verbose', 'verbose')
        .option('--profile <name>', 'profile')
        .option('--terse', 'terse')
        .option('--full', 'full');
    });

    it('should parse options with defaults', () => {
      const options = getGlobalOptions(mockCommand);

      expect(options.output).toBe('table');
      expect(options.noColor).toBe(false);
      expect(options.verbose).toBe(false);
      expect(options.terse).toBe(false);
      expect(options.full).toBe(false);
    });

    it('should validate output format', () => {
      mockCommand.setOptionValue('output', 'invalid');

      expect(() => getGlobalOptions(mockCommand)).toThrow(
        /Invalid output format: 'invalid'/
      );
      expect(() => getGlobalOptions(mockCommand)).toThrow(
        /Must be one of: table, json, yaml, plain, markdown/
      );
    });

    it('should accept valid output formats', () => {
      const formats = ['table', 'json', 'yaml', 'plain', 'markdown'];

      for (const format of formats) {
        mockCommand.setOptionValue('output', format);
        const options = getGlobalOptions(mockCommand);
        expect(options.output).toBe(format);
      }
    });

    it('should parse verbose flag', () => {
      mockCommand.setOptionValue('verbose', true);

      const options = getGlobalOptions(mockCommand);
      expect(options.verbose).toBe(true);
    });

    it('should parse noColor flag', () => {
      mockCommand.setOptionValue('noColor', true);

      const options = getGlobalOptions(mockCommand);
      expect(options.noColor).toBe(true);
    });

    it('should parse terse and full flags', () => {
      mockCommand.setOptionValue('terse', true);
      mockCommand.setOptionValue('full', true);

      const options = getGlobalOptions(mockCommand);
      expect(options.terse).toBe(true);
      expect(options.full).toBe(true);
    });

    it('should parse profile option', () => {
      mockCommand.setOptionValue('profile', 'staging');

      const options = getGlobalOptions(mockCommand);
      expect(options.profile).toBe('staging');
    });
  });
});
