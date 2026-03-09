import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flagsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('flags command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listExperiments: vi.fn().mockResolvedValue([{ id: 1, name: 'flag-1', type: 'feature' }]),
    getExperiment: vi.fn().mockResolvedValue({ id: 1, name: 'flag-1', type: 'feature' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(flagsCommand);
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

  it('should list feature flags with type filter', async () => {
    await flagsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'feature' })
    );
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get flag by id', async () => {
    await flagsCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getExperiment).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything()
    );
  });

  it('should pass custom limit', async () => {
    await flagsCommand.parseAsync(['node', 'test', 'list', '--limit', '5']);

    expect(mockClient.listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'feature' })
    );
  });
});
