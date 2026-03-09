import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchCommand } from './search.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('search command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    searchExperiments: vi.fn().mockResolvedValue([{ id: 1, name: 'found' }]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(searchCommand);
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

  it('should search with default limit of 50', async () => {
    await searchCommand.parseAsync(['node', 'test', 'my-query']);

    expect(mockClient.searchExperiments).toHaveBeenCalledWith('my-query', 50);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should pass custom --limit', async () => {
    await searchCommand.parseAsync(['node', 'test', 'query', '--limit', '10']);

    expect(mockClient.searchExperiments).toHaveBeenCalledWith('query', 10);
  });
});
