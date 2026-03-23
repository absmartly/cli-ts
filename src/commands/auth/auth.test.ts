import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authCommand } from './index.js';
import * as config from '../../lib/config/config.js';
import * as keyring from '../../lib/config/keyring.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/config/config.js');
vi.mock('../../lib/config/keyring.js');
vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn(), resolveAPIKey: vi.fn().mockResolvedValue('test-key'), resolveEndpoint: vi.fn().mockReturnValue('https://api.example.com/v1') };
});

describe('auth status command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API key display security', () => {
    beforeEach(() => {
      vi.mocked(config.loadConfig).mockReturnValue({
        'default-profile': 'default',
        profiles: {
          default: {
            api: { endpoint: 'https://api.example.com' },
            expctld: { endpoint: 'https://ctl.example.com' },
          },
        },
      });

      vi.mocked(config.getProfile).mockReturnValue({
        api: { endpoint: 'https://api.example.com' },
        expctld: { endpoint: 'https://ctl.example.com' },
      });
    });

    it('should show masked key with last 4 chars by default', async () => {
      vi.mocked(keyring.getAPIKey).mockResolvedValue('sk-1234567890abcdef');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const statusCmd = authCommand.commands.find((cmd) => cmd.name() === 'status');
      await statusCmd?.parseAsync(['node', 'test'], { from: 'user' });

      expect(consoleSpy).toHaveBeenCalledWith('API Key: ****...cdef');

      consoleSpy.mockRestore();
    });

    it('should show full key with --show-key flag', async () => {
      vi.mocked(keyring.getAPIKey).mockResolvedValue('sk-1234567890abcdef');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const statusCmd = authCommand.commands.find((cmd) => cmd.name() === 'status');
      await statusCmd?.parseAsync(['node', 'test', '--show-key'], { from: 'user' });

      expect(consoleSpy).toHaveBeenCalledWith('API Key: sk-1234567890abcdef');

      consoleSpy.mockRestore();
    });

    it('should show "not set" when no API key exists', async () => {
      vi.mocked(keyring.getAPIKey).mockResolvedValue(null);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const statusCmd = authCommand.commands.find((cmd) => cmd.name() === 'status');
      await statusCmd?.parseAsync(['node', 'test'], { from: 'user' });

      expect(consoleSpy).toHaveBeenCalledWith('API Key: not set');

      consoleSpy.mockRestore();
    });
  });
});

describe('auth API key management', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    getCurrentUser: vi.fn().mockResolvedValue({ id: 1, email: 'test@test.com', first_name: 'Test', last_name: 'User' }),
    listUserApiKeys: vi.fn().mockResolvedValue([{ id: 1, name: 'key1' }]),
    getUserApiKey: vi.fn().mockResolvedValue({ id: 1, name: 'key1' }),
    createUserApiKey: vi.fn().mockResolvedValue({ id: 2, name: 'new', key: 'secret' }),
    updateUserApiKey: vi.fn().mockResolvedValue({ id: 1, name: 'updated' }),
    deleteUserApiKey: vi.fn().mockResolvedValue(undefined),
    updateCurrentUser: vi.fn().mockResolvedValue({ id: 1, email: 'test@test.com', first_name: 'New', last_name: 'Name' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(authCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    vi.mocked(printFormatted).mockImplementation(() => {});
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

  it('should list user API keys', async () => {
    await authCommand.parseAsync(['node', 'test', 'list-api-keys']);

    expect(mockClient.listUserApiKeys).toHaveBeenCalled();
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get user API key by ID', async () => {
    await authCommand.parseAsync(['node', 'test', 'get-api-key', '1']);

    expect(mockClient.getUserApiKey).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should update user API key', async () => {
    await authCommand.parseAsync(['node', 'test', 'update-api-key', '1', '--name', 'Renamed']);

    expect(mockClient.updateUserApiKey).toHaveBeenCalledWith(1, { name: 'Renamed' });
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('updated');
  });

  it('should delete user API key', async () => {
    await authCommand.parseAsync(['node', 'test', 'delete-api-key', '1']);

    expect(mockClient.deleteUserApiKey).toHaveBeenCalledWith(1);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('deleted');
  });

  it('should edit user profile', async () => {
    await authCommand.parseAsync(['node', 'test', 'edit-profile', '--first-name', 'New', '--last-name', 'Name']);

    expect(mockClient.updateCurrentUser).toHaveBeenCalledWith({ first_name: 'New', last_name: 'Name' });
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('updated');
  });

  it('should show whoami output', async () => {
    await authCommand.parseAsync(['node', 'test', 'whoami']);

    expect(mockClient.getCurrentUser).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('test@test.com');
  });
});
