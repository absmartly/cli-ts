import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { experimentsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('experiment follow/unfollow commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    followExperiment: vi.fn(),
    unfollowExperiment: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(experimentsCommand);
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

  it('should follow an experiment', async () => {
    mockClient.followExperiment.mockResolvedValue(undefined);
    await experimentsCommand.parseAsync(['node', 'test', 'follow', '42']);
    expect(mockClient.followExperiment).toHaveBeenCalledWith(42);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Now following experiment 42');
  });

  it('should unfollow an experiment', async () => {
    mockClient.unfollowExperiment.mockResolvedValue(undefined);
    await experimentsCommand.parseAsync(['node', 'test', 'unfollow', '42']);
    expect(mockClient.unfollowExperiment).toHaveBeenCalledWith(42);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('No longer following experiment 42');
  });
});
