import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parentCommand } from './parent.js';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
} from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return {
    ...actual,
    getAPIClientFromOptions: vi.fn(),
    getGlobalOptions: vi.fn(),
    printFormatted: vi.fn(),
  };
});

describe('parent command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    getParentExperiment: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(parentCommand);
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

  it('should get parent experiment and print formatted result', async () => {
    const mockExperiment = { id: 1, name: 'parent-exp' };
    mockClient.getParentExperiment.mockResolvedValue(mockExperiment);

    await parentCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.getParentExperiment).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalledWith(mockExperiment, expect.anything());
  });

  it('should reject invalid experiment ID', async () => {
    await expect(parentCommand.parseAsync(['node', 'test', 'abc'])).rejects.toThrow();
    expect(mockClient.getParentExperiment).not.toHaveBeenCalled();
  });
});
