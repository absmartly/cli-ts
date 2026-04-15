import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metricCategoriesCommand } from './index.js';
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

describe('metric-categories command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listMetricCategories: vi.fn().mockResolvedValue([{ id: 1, name: 'engagement' }]),
    getMetricCategory: vi.fn().mockResolvedValue({ id: 1, name: 'engagement' }),
    createMetricCategory: vi.fn().mockResolvedValue({ id: 99 }),
    updateMetricCategory: vi.fn().mockResolvedValue({}),
    archiveMetricCategory: vi.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(metricCategoriesCommand);
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

  it('should list metric categories', async () => {
    await metricCategoriesCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listMetricCategories).toHaveBeenCalledWith(
      expect.objectContaining({ items: 20, page: 1 })
    );
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get metric category by id', async () => {
    await metricCategoriesCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getMetricCategory).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should create a metric category', async () => {
    await metricCategoriesCommand.parseAsync([
      'node',
      'test',
      'create',
      '--name',
      'engagement',
      '--color',
      '#FF0000',
    ]);

    expect(mockClient.createMetricCategory).toHaveBeenCalledWith({
      name: 'engagement',
      color: '#FF0000',
    });
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('created');
  });

  it('should update a metric category', async () => {
    await metricCategoriesCommand.parseAsync(['node', 'test', 'update', '1', '--name', 'new']);

    expect(mockClient.updateMetricCategory).toHaveBeenCalledWith(1, { name: 'new' });
  });

  it('should reject update with no fields', async () => {
    try {
      await metricCategoriesCommand.parseAsync(['node', 'test', 'update', '1']);
      throw new Error('Should have thrown');
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
      const errorOutput = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errorOutput).toContain('update field');
    }
  });

  it('should archive a metric category', async () => {
    await metricCategoriesCommand.parseAsync(['node', 'test', 'archive', '1']);

    expect(mockClient.archiveMetricCategory).toHaveBeenCalledWith(1, true);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('archived');
  });

  it('should unarchive a metric category with --unarchive', async () => {
    await metricCategoriesCommand.parseAsync(['node', 'test', 'archive', '1', '--unarchive']);

    expect(mockClient.archiveMetricCategory).toHaveBeenCalledWith(1, false);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('unarchived');
  });
});
