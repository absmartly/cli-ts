import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metricsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('metrics command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listMetrics: vi.fn().mockResolvedValue([{ id: 1, name: 'ctr' }]),
    getMetric: vi.fn().mockResolvedValue({ id: 1, name: 'ctr' }),
    createMetric: vi.fn().mockResolvedValue({ id: 99 }),
    updateMetric: vi.fn().mockResolvedValue({}),
    archiveMetric: vi.fn().mockResolvedValue({}),
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

  it('should list metrics', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listMetrics).toHaveBeenCalledWith({ items: 100, page: 1, archived: undefined });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get metric by id', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getMetric).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything()
    );
  });

  it('should create a metric', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'create', '--name', 'ctr']);

    expect(mockClient.createMetric).toHaveBeenCalledWith({ name: 'ctr' });
  });

  it('should update a metric', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'update', '1', '--description', 'x']);

    expect(mockClient.updateMetric).toHaveBeenCalledWith(1, { description: 'x' });
  });

  it('should reject update with no fields', async () => {
    try {
      await metricsCommand.parseAsync(['node', 'test', 'update', '1']);
      throw new Error('Should have thrown');
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
      const errorOutput = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errorOutput).toContain('update field');
    }
  });

  it('should archive a metric', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'archive', '1']);

    expect(mockClient.archiveMetric).toHaveBeenCalledWith(1, undefined);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('archived');
  });

  it('should unarchive a metric', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'archive', '1', '--unarchive']);

    expect(mockClient.archiveMetric).toHaveBeenCalledWith(1, true);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('unarchived');
  });
});
