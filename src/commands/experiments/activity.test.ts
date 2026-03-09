import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { activityCommand } from './activity.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('activity command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listExperimentActivity: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(activityCommand);
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

  it('should list activity and print formatted results', async () => {
    mockClient.listExperimentActivity.mockResolvedValue([{ id: 1, text: 'started' }]);

    await activityCommand.parseAsync(['node', 'test', 'list', '42']);

    expect(mockClient.listExperimentActivity).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should show message when no activity found', async () => {
    mockClient.listExperimentActivity.mockResolvedValue([]);

    await activityCommand.parseAsync(['node', 'test', 'list', '42']);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('No activity found');
    expect(printFormatted).not.toHaveBeenCalled();
  });
});
