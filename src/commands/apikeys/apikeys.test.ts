import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiKeysCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('apikeys command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listApiKeys: vi.fn().mockResolvedValue([{ id: 1, name: 'default' }]),
    getApiKey: vi.fn().mockResolvedValue({ id: 5, name: 'default' }),
    createApiKey: vi.fn().mockResolvedValue({ id: 99 }),
    updateApiKey: vi.fn().mockResolvedValue({}),
    deleteApiKey: vi.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(apiKeysCommand);
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

  it('should list api keys', async () => {
    await apiKeysCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listApiKeys).toHaveBeenCalledWith(20, 1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list api keys with custom offset', async () => {
    await apiKeysCommand.parseAsync(['node', 'test', 'list', '--page', '2']);

    expect(mockClient.listApiKeys).toHaveBeenCalledWith(20, 2);
  });

  it('should get api key by id', async () => {
    await apiKeysCommand.parseAsync(['node', 'test', 'get', '5']);

    expect(mockClient.getApiKey).toHaveBeenCalledWith(5);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5 }),
      expect.anything()
    );
  });

  it('should create an api key', async () => {
    await apiKeysCommand.parseAsync(['node', 'test', 'create', '--name', 'my-key']);

    expect(mockClient.createApiKey).toHaveBeenCalledWith({ name: 'my-key' });
  });

  it('should update an api key', async () => {
    await apiKeysCommand.parseAsync(['node', 'test', 'update', '5', '--name', 'new']);

    expect(mockClient.updateApiKey).toHaveBeenCalledWith(5, { name: 'new' });
  });

  it('should reject update with no fields', async () => {
    try {
      await apiKeysCommand.parseAsync(['node', 'test', 'update', '5']);
      throw new Error('Should have thrown');
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
      const errorOutput = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errorOutput).toContain('update field');
    }
  });

  it('should delete an api key', async () => {
    await apiKeysCommand.parseAsync(['node', 'test', 'delete', '5']);

    expect(mockClient.deleteApiKey).toHaveBeenCalledWith(5);
  });
});
