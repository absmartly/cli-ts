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

  const defaultListParams = {
    items: 100,
    page: 1,
    archived: undefined,
    search: undefined,
    sort: undefined,
    sort_asc: undefined,
    ids: undefined,
    owners: undefined,
    teams: undefined,
    review_status: undefined,
  };

  it('should list metrics', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listMetrics).toHaveBeenCalledWith(defaultListParams);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list metrics with search filter', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'list', '--search', 'ctr']);

    expect(mockClient.listMetrics).toHaveBeenCalledWith({ ...defaultListParams, search: 'ctr' });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list metrics with sort and direction', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'list', '--sort', 'name', '--asc']);

    expect(mockClient.listMetrics).toHaveBeenCalledWith({ ...defaultListParams, sort: 'name', sort_asc: true });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list metrics filtered by owners', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'list', '--owners', '1,2,3']);

    expect(mockClient.listMetrics).toHaveBeenCalledWith({ ...defaultListParams, owners: '1,2,3' });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list metrics filtered by teams', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'list', '--teams', '5,10']);

    expect(mockClient.listMetrics).toHaveBeenCalledWith({ ...defaultListParams, teams: '5,10' });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list metrics filtered by ids', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'list', '--ids', '1,2,3']);

    expect(mockClient.listMetrics).toHaveBeenCalledWith({ ...defaultListParams, ids: '1,2,3' });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list metrics filtered by review status', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'list', '--review-status', 'pending']);

    expect(mockClient.listMetrics).toHaveBeenCalledWith({ ...defaultListParams, review_status: 'pending' });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should list metrics with all filters combined', async () => {
    await metricsCommand.parseAsync([
      'node', 'test', 'list',
      '--archived', '--search', 'conversion', '--sort', 'created_at', '--desc',
      '--owners', '1', '--teams', '2', '--review-status', 'approved',
    ]);

    expect(mockClient.listMetrics).toHaveBeenCalledWith({
      ...defaultListParams,
      archived: true,
      search: 'conversion',
      sort: 'created_at',
      sort_asc: false,
      owners: '1',
      teams: '2',
      review_status: 'approved',
    });
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

  it('should create a metric with required fields', async () => {
    await metricsCommand.parseAsync(['node', 'test', 'create', '--name', 'ctr', '--type', 'goal_count', '--description', 'Click-through rate']);

    expect(mockClient.createMetric).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ctr', type: 'goal_count', description: 'Click-through rate', effect: 'positive' })
    );
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
