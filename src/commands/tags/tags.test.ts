import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tagsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('tags command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listExperimentTags: vi.fn().mockResolvedValue([{ id: 1, tag: 'beta' }]),
    getExperimentTag: vi.fn().mockResolvedValue({ id: 1, tag: 'beta' }),
    createExperimentTag: vi.fn().mockResolvedValue({ id: 99, tag: 'my-tag' }),
    updateExperimentTag: vi.fn().mockResolvedValue({}),
    deleteExperimentTag: vi.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(tagsCommand);
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

  it('should list experiment tags', async () => {
    await tagsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listExperimentTags).toHaveBeenCalledWith(20, 0);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get experiment tag by id', async () => {
    await tagsCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getExperimentTag).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should create an experiment tag', async () => {
    await tagsCommand.parseAsync(['node', 'test', 'create', '--tag', 'my-tag']);

    expect(mockClient.createExperimentTag).toHaveBeenCalledWith({ tag: 'my-tag' });
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('created');
  });

  it('should update an experiment tag', async () => {
    await tagsCommand.parseAsync(['node', 'test', 'update', '1', '--tag', 'new']);

    expect(mockClient.updateExperimentTag).toHaveBeenCalledWith(1, { tag: 'new' });
  });

  it('should delete an experiment tag', async () => {
    await tagsCommand.parseAsync(['node', 'test', 'delete', '1']);

    expect(mockClient.deleteExperimentTag).toHaveBeenCalledWith(1);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('deleted');
  });
});
