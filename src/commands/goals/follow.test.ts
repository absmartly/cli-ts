import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { goalsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('goal follow/unfollow commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    followGoal: vi.fn(),
    unfollowGoal: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(goalsCommand);
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

  it('should follow a goal', async () => {
    mockClient.followGoal.mockResolvedValue(undefined);
    await goalsCommand.parseAsync(['node', 'test', 'follow', '5']);
    expect(mockClient.followGoal).toHaveBeenCalledWith(5);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Now following goal 5');
  });

  it('should unfollow a goal', async () => {
    mockClient.unfollowGoal.mockResolvedValue(undefined);
    await goalsCommand.parseAsync(['node', 'test', 'unfollow', '5']);
    expect(mockClient.unfollowGoal).toHaveBeenCalledWith(5);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('No longer following goal 5');
  });
});
