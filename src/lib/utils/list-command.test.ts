import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createListCommand } from './list-command.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from './api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('./api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api-helper.js')>();
  return {
    ...actual,
    getAPIClientFromOptions: vi.fn(),
    getGlobalOptions: vi.fn(),
    printFormatted: vi.fn(),
  };
});

vi.mock('./pagination.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pagination.js')>();
  return { ...actual, printPaginationFooter: vi.fn() };
});

describe('createListCommand', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockFetch = vi.fn().mockResolvedValue([{ id: 1, name: 'item1' }]);
  const mockClient = {};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
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

  it('should create a command with expected options', () => {
    const cmd = createListCommand({
      description: 'List items',
      fetch: mockFetch,
    });

    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--items');
    expect(optionNames).toContain('--page');
    expect(optionNames).toContain('--show');
    expect(optionNames).toContain('--exclude');
  });

  it('should call fetch and printFormatted when action runs', async () => {
    const cmd = createListCommand({
      description: 'List items',
      fetch: mockFetch,
    });
    resetCommand(cmd);

    await cmd.parseAsync(['node', 'test']);

    expect(mockFetch).toHaveBeenCalledWith(mockClient, expect.any(Object));
    expect(printFormatted).toHaveBeenCalled();
  });
});
