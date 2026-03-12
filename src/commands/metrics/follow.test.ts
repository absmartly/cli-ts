import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metricsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('metric follow/unfollow commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    followMetric: vi.fn(),
    unfollowMetric: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(metricsCommand);
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

  it('should follow a metric', async () => {
    mockClient.followMetric.mockResolvedValue(undefined);
    await metricsCommand.parseAsync(['node', 'test', 'follow', '10']);
    expect(mockClient.followMetric).toHaveBeenCalledWith(10);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Now following metric 10');
  });

  it('should unfollow a metric', async () => {
    mockClient.unfollowMetric.mockResolvedValue(undefined);
    await metricsCommand.parseAsync(['node', 'test', 'unfollow', '10']);
    expect(mockClient.unfollowMetric).toHaveBeenCalledWith(10);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('No longer following metric 10');
  });
});
