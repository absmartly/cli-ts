import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recommendationsCommand } from './recommendations.js';
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

describe('recommendations command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listRecommendedActions: vi.fn(),
    dismissRecommendedAction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(recommendationsCommand);
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

  it('should list recommended actions and print formatted results', async () => {
    const mockActions = [{ id: 1, type: 'cleanup', experiment_id: 42 }];
    mockClient.listRecommendedActions.mockResolvedValue(mockActions);

    await recommendationsCommand.parseAsync(['node', 'test', 'list', '42']);

    expect(mockClient.listRecommendedActions).toHaveBeenCalledWith(42);
    expect(printFormatted).toHaveBeenCalledWith(mockActions, expect.anything());
  });

  it('should show message when no recommended actions found', async () => {
    mockClient.listRecommendedActions.mockResolvedValue([]);

    await recommendationsCommand.parseAsync(['node', 'test', 'list', '42']);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('No recommended actions found');
    expect(printFormatted).not.toHaveBeenCalled();
  });

  it('should dismiss a recommended action', async () => {
    mockClient.dismissRecommendedAction.mockResolvedValue(undefined);

    await recommendationsCommand.parseAsync(['node', 'test', 'dismiss', '7']);

    expect(mockClient.dismissRecommendedAction).toHaveBeenCalledWith(7);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('7');
    expect(output).toContain('dismissed');
  });
});
