import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { goalsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('goals command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listGoals: vi.fn().mockResolvedValue([{ id: 1, name: 'conversion' }]),
    getGoal: vi.fn().mockResolvedValue({ id: 1, name: 'conversion' }),
    createGoal: vi.fn().mockResolvedValue({ id: 99 }),
    updateGoal: vi.fn().mockResolvedValue({}),
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

  it('should list goals', async () => {
    await goalsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listGoals).toHaveBeenCalledWith(100, 0);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list goals with custom limit', async () => {
    await goalsCommand.parseAsync(['node', 'test', 'list', '--limit', '5']);

    expect(mockClient.listGoals).toHaveBeenCalled();
  });

  it('should get goal by id', async () => {
    await goalsCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getGoal).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything()
    );
  });

  it('should create a goal', async () => {
    await goalsCommand.parseAsync(['node', 'test', 'create', '--name', 'new_goal']);

    expect(mockClient.createGoal).toHaveBeenCalledWith({ name: 'new_goal' });
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Goal created');
    expect(output).toContain('99');
  });

  it('should update a goal', async () => {
    await goalsCommand.parseAsync(['node', 'test', 'update', '1', '--description', 'updated']);

    expect(mockClient.updateGoal).toHaveBeenCalledWith(1, { description: 'updated' });
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Goal 1 updated');
  });

  it('should reject update with no fields', async () => {
    try {
      await goalsCommand.parseAsync(['node', 'test', 'update', '1']);
      throw new Error('Should have thrown');
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
      const errorOutput = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errorOutput).toContain('update field');
    }
  });
});
