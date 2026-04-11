import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configCommand } from './index.js';
import {
  loadConfig,
  listProfiles,
  setDefaultProfile,
  getConfigValue,
  setConfigValue,
  unsetConfigValue,
  deleteProfile,
} from '../../lib/config/config.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/config/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({
    'default-profile': 'default',
    profiles: { default: { api: { endpoint: 'https://api.example.com/v1' } } },
    output: 'table',
    'analytics-opt-out': false,
  }),
  listProfiles: vi.fn().mockReturnValue(['default', 'staging']),
  setDefaultProfile: vi.fn(),
  getConfigValue: vi.fn(),
  setConfigValue: vi.fn(),
  unsetConfigValue: vi.fn(),
  deleteProfile: vi.fn(),
}));

describe('config command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(configCommand);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
      throw new Error(`process.exit: ${code}`);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should list config values', async () => {
    await configCommand.parseAsync(['node', 'test', 'list']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Profile: default');
    expect(output).toContain('Endpoint: https://api.example.com/v1');
  });

  it('should error on unknown profile', async () => {
    try {
      await configCommand.parseAsync(['node', 'test', 'list', '--profile', 'nonexistent']);
      throw new Error('Should have thrown');
    } catch (error) {
      if ((error as Error).message.startsWith('process.exit')) {
        const output = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(output).toContain('not found');
      } else {
        throw error;
      }
    }
  });

  it('should get config value', async () => {
    vi.mocked(getConfigValue).mockReturnValue('table');

    await configCommand.parseAsync(['node', 'test', 'get', 'output']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('table');
  });

  it('should get error on missing key', async () => {
    vi.mocked(getConfigValue).mockReturnValue(undefined);

    try {
      await configCommand.parseAsync(['node', 'test', 'get', 'missing-key']);
      throw new Error('Should have thrown');
    } catch (error) {
      if ((error as Error).message.startsWith('process.exit')) {
        const output = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(output).toContain('not found');
      } else {
        throw error;
      }
    }
  });

  it('should set config value', async () => {
    await configCommand.parseAsync(['node', 'test', 'set', 'output', 'json']);

    expect(setConfigValue).toHaveBeenCalledWith('output', 'json');
  });

  it('should unset config value', async () => {
    await configCommand.parseAsync(['node', 'test', 'unset', 'output']);

    expect(unsetConfigValue).toHaveBeenCalledWith('output');
  });

  it('should list profiles', async () => {
    await configCommand.parseAsync(['node', 'test', 'profiles', 'list']);

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('default');
    expect(output).toContain('staging');
  });

  it('should set default profile', async () => {
    await configCommand.parseAsync(['node', 'test', 'profiles', 'use', 'staging']);

    expect(setDefaultProfile).toHaveBeenCalledWith('staging');
  });

  it('should delete profile', async () => {
    await configCommand.parseAsync(['node', 'test', 'profiles', 'delete', 'staging']);

    expect(deleteProfile).toHaveBeenCalledWith('staging');
  });
});
