import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';

vi.mock('../config/config', () => ({
  loadConfig: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock('../config/keyring', () => ({
  getAPIKey: vi.fn(),
  getOAuthToken: vi.fn(),
}));

vi.mock('../api/client', () => ({
  createAPIClient: vi.fn(),
}));

vi.mock('../output/formatter', () => ({
  formatOutput: vi.fn((data) => JSON.stringify(data)),
}));

import { getAPIClientFromOptions, getGlobalOptions, printFormatted, withErrorHandling, resolveAuth } from './api-helper.js';
import { loadConfig, getProfile } from '../config/config.js';
import { getAPIKey, getOAuthToken } from '../config/keyring.js';
import { createAPIClient } from '../api/client.js';
import { formatOutput } from '../output/formatter.js';

describe('API Helper', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    savedEnv.ABSMARTLY_API_KEY = process.env.ABSMARTLY_API_KEY;
    savedEnv.ABSMARTLY_API_ENDPOINT = process.env.ABSMARTLY_API_ENDPOINT;
    delete process.env.ABSMARTLY_API_KEY;
    delete process.env.ABSMARTLY_API_ENDPOINT;
  });

  afterEach(() => {
    if (savedEnv.ABSMARTLY_API_KEY !== undefined) process.env.ABSMARTLY_API_KEY = savedEnv.ABSMARTLY_API_KEY;
    else delete process.env.ABSMARTLY_API_KEY;
    if (savedEnv.ABSMARTLY_API_ENDPOINT !== undefined) process.env.ABSMARTLY_API_ENDPOINT = savedEnv.ABSMARTLY_API_ENDPOINT;
    else delete process.env.ABSMARTLY_API_ENDPOINT;
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
        /abs auth login/
      );
    });

    it('should throw error when no endpoint is configured', async () => {
      (loadConfig as any).mockReturnValue({
        'default-profile': 'default',
      });
      (getProfile as any).mockReturnValue({
        api: { endpoint: '' },
        expctld: { endpoint: '' },
      });

      await expect(getAPIClientFromOptions({})).rejects.toThrow(
        /No API endpoint configured for profile "default"/
      );
      await expect(getAPIClientFromOptions({})).rejects.toThrow(
        /abs auth login/
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
        { method: 'api-key', apiKey: 'staging-key' },
        { verbose: false, insecure: false }
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
        { method: 'api-key', apiKey: 'override-key' },
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
        { method: 'api-key', apiKey: 'test-key' },
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
        expect.any(Object),
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
      expect(options.noColor).toBe(!process.stdout.isTTY);
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
        /Must be one of: table, json, yaml, plain, markdown, rendered, template, vertical/
      );
    });

    it('should accept valid output formats', () => {
      const formats = ['table', 'json', 'yaml', 'plain', 'markdown', 'vertical'];

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

    it('should handle --no-color flag', () => {
      mockCommand.parse(['node', 'test', '--no-color']);

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

    it('should pass noColor correctly to formatOutput when --no-color is set', () => {
      mockCommand.parse(['node', 'test', '--no-color']);

      const globalOptions = getGlobalOptions(mockCommand);
      const testData = { name: 'test-experiment', status: 'running' };

      printFormatted(testData, globalOptions);

      expect(formatOutput).toHaveBeenCalledWith(
        testData,
        'table',
        expect.objectContaining({
          noColor: true,
          full: false,
          terse: false,
        })
      );
    });

    it('should auto-detect noColor from TTY when --no-color is not set', () => {
      mockCommand.parse(['node', 'test']);

      const globalOptions = getGlobalOptions(mockCommand);
      const testData = { name: 'test-experiment', status: 'running' };

      printFormatted(testData, globalOptions);

      expect(formatOutput).toHaveBeenCalledWith(
        testData,
        'table',
        expect.objectContaining({
          noColor: !process.stdout.isTTY,
          full: false,
          terse: false,
        })
      );
    });
  });

  describe('withErrorHandling', () => {    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let processExitSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
        throw new Error(`process.exit: ${code}`);
      });
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should catch async errors and call handleCommandError', async () => {
      const wrapped = withErrorHandling(async () => {
        throw new Error('test async error');
      });

      await expect(wrapped()).rejects.toThrow('process.exit: 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'test async error');
    });

    it('should exit with code 1', async () => {
      const wrapped = withErrorHandling(async () => {
        throw new Error('fail');
      });

      await expect(wrapped()).rejects.toThrow('process.exit: 1');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error throws', async () => {
      const wrapped = withErrorHandling(async () => {
        throw 'string error';
      });

      await expect(wrapped()).rejects.toThrow('process.exit: 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'string error');
    });

    it('should not interfere with successful execution', async () => {
      const fn = vi.fn().mockResolvedValue(undefined);
      const wrapped = withErrorHandling(fn);

      await wrapped();
      expect(fn).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(processExitSpy).not.toHaveBeenCalled();
    });
  });

  describe('resolveAuth', () => {
    beforeEach(() => {
      (loadConfig as any).mockReturnValue({
        'default-profile': 'default',
        'analytics-opt-out': false,
        output: 'table',
        profiles: {
          default: {
            api: { endpoint: 'https://api.example.com/v1' },
            expctld: { endpoint: '' },
          },
        },
      });

      (getProfile as any).mockReturnValue({
        api: { endpoint: 'https://api.example.com/v1' },
        expctld: { endpoint: '' },
      });
    });

    it('returns api-key auth when --api-key flag is provided', async () => {
      const auth = await resolveAuth({ apiKey: 'flag-key' });
      expect(auth).toEqual({ method: 'api-key', apiKey: 'flag-key' });
    });

    it('returns api-key auth from env var', async () => {
      process.env.ABSMARTLY_API_KEY = 'env-key';
      const auth = await resolveAuth({});
      expect(auth).toEqual({ method: 'api-key', apiKey: 'env-key' });
    });

    it('returns api-key auth from keyring when auth-method is api-key', async () => {
      (getAPIKey as any).mockResolvedValue('keyring-api-key');
      const auth = await resolveAuth({});
      expect(auth).toEqual({ method: 'api-key', apiKey: 'keyring-api-key' });
    });

    it('returns oauth-jwt auth from keyring when auth-method is oauth-jwt', async () => {
      (getProfile as any).mockReturnValue({
        api: { endpoint: 'https://api.example.com/v1', 'auth-method': 'oauth-jwt' },
        expctld: { endpoint: '' },
      });
      (getOAuthToken as any).mockResolvedValue('jwt-token-from-keyring');

      const auth = await resolveAuth({});
      expect(auth.method).toBe('oauth-jwt');
      if (auth.method === 'oauth-jwt') {
        expect(auth.token).toBe('jwt-token-from-keyring');
      }
    });

    it('--api-key flag overrides oauth-jwt auth-method in profile', async () => {
      (getProfile as any).mockReturnValue({
        api: { endpoint: 'https://api.example.com/v1', 'auth-method': 'oauth-jwt' },
        expctld: { endpoint: '' },
      });

      const auth = await resolveAuth({ apiKey: 'override-key' });
      expect(auth).toEqual({ method: 'api-key', apiKey: 'override-key' });
    });

    it('throws when no api key found', async () => {
      (getAPIKey as any).mockResolvedValue(null);
      await expect(resolveAuth({})).rejects.toThrow('No API key found');
    });

    it('throws when no oauth token found', async () => {
      (getProfile as any).mockReturnValue({
        api: { endpoint: 'https://api.example.com/v1', 'auth-method': 'oauth-jwt' },
        expctld: { endpoint: '' },
      });
      (getOAuthToken as any).mockResolvedValue(null);
      await expect(resolveAuth({})).rejects.toThrow('No OAuth token found');
    });
  });
});
