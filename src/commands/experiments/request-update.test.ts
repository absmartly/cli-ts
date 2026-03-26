import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestUpdateCommand } from './request-update.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('experiments request-update', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    requestExperimentUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(requestUpdateCommand);
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

  it('should request analysis update for an experiment', async () => {
    mockClient.requestExperimentUpdate.mockResolvedValue(undefined);

    await requestUpdateCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.requestExperimentUpdate).toHaveBeenCalledWith(42, undefined);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Analysis update requested for experiment 42');
  });

  it('should pass specific tasks', async () => {
    mockClient.requestExperimentUpdate.mockResolvedValue(undefined);

    await requestUpdateCommand.parseAsync(['node', 'test', '42', '--tasks', 'preview_metrics,preview_summary']);

    expect(mockClient.requestExperimentUpdate).toHaveBeenCalledWith(42, {
      tasks: ['preview_metrics', 'preview_summary'],
    });
  });

  it('should pass replace-gsa flag', async () => {
    mockClient.requestExperimentUpdate.mockResolvedValue(undefined);

    await requestUpdateCommand.parseAsync(['node', 'test', '42', '--replace-gsa']);

    expect(mockClient.requestExperimentUpdate).toHaveBeenCalledWith(42, {
      replaceGroupSequentialAnalysis: true,
    });
  });

  it('should pass both tasks and replace-gsa', async () => {
    mockClient.requestExperimentUpdate.mockResolvedValue(undefined);

    await requestUpdateCommand.parseAsync(['node', 'test', '42', '--tasks', 'preview_group_sequential', '--replace-gsa']);

    expect(mockClient.requestExperimentUpdate).toHaveBeenCalledWith(42, {
      tasks: ['preview_group_sequential'],
      replaceGroupSequentialAnalysis: true,
    });
  });

  it('should reject invalid task names', async () => {
    await expect(requestUpdateCommand.parseAsync(['node', 'test', '42', '--tasks', 'invalid_task'])).rejects.toThrow('Invalid task');
  });

  it('should reject invalid experiment ID', async () => {
    await expect(requestUpdateCommand.parseAsync(['node', 'test', 'abc'])).rejects.toThrow();
  });

  it('should handle API errors', async () => {
    mockClient.requestExperimentUpdate.mockRejectedValue(new Error('Not found'));

    await expect(requestUpdateCommand.parseAsync(['node', 'test', '42'])).rejects.toThrow();
  });
});
