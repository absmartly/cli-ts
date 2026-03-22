import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { goalTagsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('goal-tags command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listGoalTags: vi.fn().mockResolvedValue([{ id: 1, tag: 'beta' }]),
    getGoalTag: vi.fn().mockResolvedValue({ id: 1, tag: 'beta' }),
    createGoalTag: vi.fn().mockResolvedValue({ id: 99, tag: 'my-tag' }),
    updateGoalTag: vi.fn().mockResolvedValue({}),
    deleteGoalTag: vi.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(goalTagsCommand);
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

  it('should list goal tags', async () => {
    await goalTagsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listGoalTags).toHaveBeenCalledWith(20, 1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get goal tag by id', async () => {
    await goalTagsCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getGoalTag).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should create a goal tag', async () => {
    await goalTagsCommand.parseAsync(['node', 'test', 'create', '--tag', 'my-tag']);

    expect(mockClient.createGoalTag).toHaveBeenCalledWith({ tag: 'my-tag' });
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('created');
  });

  it('should update a goal tag', async () => {
    await goalTagsCommand.parseAsync(['node', 'test', 'update', '1', '--tag', 'new']);

    expect(mockClient.updateGoalTag).toHaveBeenCalledWith(1, { tag: 'new' });
  });

  it('should delete a goal tag', async () => {
    await goalTagsCommand.parseAsync(['node', 'test', 'delete', '1']);

    expect(mockClient.deleteGoalTag).toHaveBeenCalledWith(1);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('deleted');
  });
});
