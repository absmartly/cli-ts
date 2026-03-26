import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usersCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('users api-keys command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listUserApiKeysByUserId: vi.fn().mockResolvedValue([{ id: 1, name: 'key1' }]),
    getUserApiKeyByUserId: vi.fn().mockResolvedValue({ id: 1, name: 'key1' }),
    createUserApiKeyByUserId: vi.fn().mockResolvedValue({ id: 2, name: 'new-key', key: 'secret-key-value' }),
    updateUserApiKeyByUserId: vi.fn().mockResolvedValue({ id: 1, name: 'updated' }),
    deleteUserApiKeyByUserId: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(usersCommand);
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

  it('should list api keys for a user', async () => {
    await usersCommand.parseAsync(['node', 'test', 'api-keys', 'list', '--user', '42']);

    expect(mockClient.listUserApiKeysByUserId).toHaveBeenCalledWith(42, 20, 1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list api keys with pagination', async () => {
    await usersCommand.parseAsync(['node', 'test', 'api-keys', 'list', '--user', '42', '--items', '10', '--page', '2']);

    expect(mockClient.listUserApiKeysByUserId).toHaveBeenCalledWith(42, 10, 2);
  });

  it('should get an api key for a user', async () => {
    await usersCommand.parseAsync(['node', 'test', 'api-keys', 'get', '1', '--user', '42']);

    expect(mockClient.getUserApiKeyByUserId).toHaveBeenCalledWith(42, 1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should create an api key for a user', async () => {
    await usersCommand.parseAsync(['node', 'test', 'api-keys', 'create', '--user', '42', '--name', 'my-key']);

    expect(mockClient.createUserApiKeyByUserId).toHaveBeenCalledWith(42, { name: 'my-key', description: undefined });
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('API key created');
    expect(output).toContain('secret-key-value');
  });

  it('should create an api key with description', async () => {
    await usersCommand.parseAsync(['node', 'test', 'api-keys', 'create', '--user', '42', '--name', 'my-key', '--description', 'test key']);

    expect(mockClient.createUserApiKeyByUserId).toHaveBeenCalledWith(42, { name: 'my-key', description: 'test key' });
  });

  it('should update an api key for a user', async () => {
    await usersCommand.parseAsync(['node', 'test', 'api-keys', 'update', '1', '--user', '42', '--name', 'renamed']);

    expect(mockClient.updateUserApiKeyByUserId).toHaveBeenCalledWith(42, 1, { name: 'renamed' });
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('updated');
  });

  it('should reject update with no fields', async () => {
    try {
      await usersCommand.parseAsync(['node', 'test', 'api-keys', 'update', '1', '--user', '42']);
      throw new Error('Should have thrown');
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
      const errorOutput = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errorOutput).toContain('update field');
    }
  });

  it('should delete an api key for a user', async () => {
    await usersCommand.parseAsync(['node', 'test', 'api-keys', 'delete', '1', '--user', '42']);

    expect(mockClient.deleteUserApiKeyByUserId).toHaveBeenCalledWith(42, 1);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('deleted');
  });
});
