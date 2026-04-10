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

vi.mock('../../core/experiments/export-wait.js', () => ({
  fetchExportStatus: vi.fn(),
}));

vi.mock('../../lib/utils/polling.js', () => ({
  startPolling: vi.fn().mockReturnValue({ stop: vi.fn() }),
}));

import { fetchExportStatus } from '../../core/experiments/export-wait.js';
import { startPolling } from '../../lib/utils/polling.js';

describe('experiments export', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    exportExperimentData: vi.fn(),
    resolveExperimentId: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(exportCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    mockClient.resolveExperimentId.mockResolvedValue(42);
    mockClient.exportExperimentData.mockResolvedValue({ id: 99, experiment_id: 42 });
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
      throw new Error(`process.exit: ${code}`);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should export experiment data', async () => {
    await exportCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.exportExperimentData).toHaveBeenCalledWith(42);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Experiment 42 data export initiated');
  });

  it('should accept experiment name and resolve to ID', async () => {
    mockClient.resolveExperimentId.mockResolvedValue(42);

    await exportCommand.parseAsync(['node', 'test', 'my-experiment']);

    expect(mockClient.resolveExperimentId).toHaveBeenCalledWith('my-experiment');
    expect(mockClient.exportExperimentData).toHaveBeenCalledWith(42);
  });

  it('should handle API errors', async () => {
    mockClient.exportExperimentData.mockRejectedValue(new Error('Not found'));

    await expect(exportCommand.parseAsync(['node', 'test', '42'])).rejects.toThrow();
  });

  describe('--wait', () => {
    it('should poll and display download URL on COMPLETED', async () => {
      vi.mocked(fetchExportStatus).mockResolvedValue({
        exportConfig: { id: 99, experiment_id: 42, download_file_key: 'export.zip' },
        latestHistory: {
          id: 1,
          status: 'COMPLETED',
          progress: 100,
          exported_rows: 5000,
          total_rows: 5000,
          remaining_seconds: 0,
        },
        status: 'COMPLETED',
        progress: 100,
        exportedRows: 5000,
        totalRows: 5000,
        remainingSeconds: 0,
        isTerminal: true,
        downloadUrl: 'https://api.example.com/v1/experiments/exports/99/export.zip',
      });

      await exportCommand.parseAsync(['node', 'test', '42', '--wait']);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Export completed!');
      expect(output).toContain('Exported rows: 5000');
      expect(output).toContain(
        'https://api.example.com/v1/experiments/exports/99/export.zip'
      );
    });

    it('should exit with error on FAILED', async () => {
      vi.mocked(fetchExportStatus).mockResolvedValue({
        exportConfig: { id: 99, experiment_id: 42 },
        latestHistory: {
          id: 1,
          status: 'FAILED',
          progress: 0,
          exported_rows: 0,
          total_rows: 0,
          remaining_seconds: 0,
        },
        status: 'FAILED',
        progress: 0,
        exportedRows: 0,
        totalRows: 0,
        remainingSeconds: 0,
        isTerminal: true,
        downloadUrl: null,
      });

      await expect(
        exportCommand.parseAsync(['node', 'test', '42', '--wait'])
      ).rejects.toThrow('process.exit: 1');

      const errorOutput = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errorOutput).toContain('Export failed');
    });

    it('should show progress for IN_PROGRESS status', async () => {
      vi.mocked(fetchExportStatus).mockResolvedValue({
        exportConfig: { id: 99, experiment_id: 42 },
        latestHistory: {
          id: 1,
          status: 'IN_PROGRESS',
          progress: 45,
          exported_rows: 2250,
          total_rows: 5000,
          remaining_seconds: 30,
        },
        status: 'IN_PROGRESS',
        progress: 45,
        exportedRows: 2250,
        totalRows: 5000,
        remainingSeconds: 30,
        isTerminal: false,
        downloadUrl: null,
      });

      await exportCommand.parseAsync(['node', 'test', '42', '--wait']);

      const writeOutput = stdoutWriteSpy.mock.calls.flat().join('');
      expect(writeOutput).toContain('IN_PROGRESS');
      expect(writeOutput).toContain('45%');
      expect(writeOutput).toContain('2250/5000 rows');
      expect(writeOutput).toContain('ETA: 30s');
    });

    it('should reject invalid interval', async () => {
      await expect(
        exportCommand.parseAsync(['node', 'test', '42', '--wait', '--interval', '0'])
      ).rejects.toThrow('process.exit: 1');

      const errorOutput = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errorOutput).toContain('Interval must be a positive integer');
    });
  });
});
