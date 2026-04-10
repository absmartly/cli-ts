import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportCommand } from './export.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
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

describe('experiments export', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    exportExperimentData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(exportCommand);
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

  it('should export experiment data', async () => {
    mockClient.exportExperimentData.mockResolvedValue(undefined);

    await exportCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.exportExperimentData).toHaveBeenCalledWith(42);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Experiment 42 data export initiated');
  });

  it('should reject invalid experiment ID', async () => {
    await expect(exportCommand.parseAsync(['node', 'test', 'abc'])).rejects.toThrow();
  });

  it('should handle API errors', async () => {
    mockClient.exportExperimentData.mockRejectedValue(new Error('Not found'));

    await expect(exportCommand.parseAsync(['node', 'test', '42'])).rejects.toThrow();
  });
});
