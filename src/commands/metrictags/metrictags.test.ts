import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metricTagsCommand } from './index.js';
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

describe('metric-tags command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listMetricTags: vi.fn().mockResolvedValue([{ id: 1, tag: 'beta' }]),
    getMetricTag: vi.fn().mockResolvedValue({ id: 1, tag: 'beta' }),
    createMetricTag: vi.fn().mockResolvedValue({ id: 99, tag: 'my-tag' }),
    updateMetricTag: vi.fn().mockResolvedValue({}),
    deleteMetricTag: vi.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(metricTagsCommand);
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

  it('should list metric tags', async () => {
    await metricTagsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listMetricTags).toHaveBeenCalledWith(20, 1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get metric tag by id', async () => {
    await metricTagsCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getMetricTag).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should create a metric tag', async () => {
    await metricTagsCommand.parseAsync(['node', 'test', 'create', '--tag', 'my-tag']);

    expect(mockClient.createMetricTag).toHaveBeenCalledWith({ tag: 'my-tag' });
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('created');
  });

  it('should update a metric tag', async () => {
    await metricTagsCommand.parseAsync(['node', 'test', 'update', '1', '--tag', 'new']);

    expect(mockClient.updateMetricTag).toHaveBeenCalledWith(1, { tag: 'new' });
  });

  it('should delete a metric tag', async () => {
    await metricTagsCommand.parseAsync(['node', 'test', 'delete', '1']);

    expect(mockClient.deleteMetricTag).toHaveBeenCalledWith(1);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('deleted');
  });
});
