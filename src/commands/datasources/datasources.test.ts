import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { datasourcesCommand } from './index.js';
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

describe('datasources command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    listDatasources: vi.fn().mockResolvedValue([{ id: 1, name: 'ds1' }]),
    getDatasource: vi.fn().mockResolvedValue({ id: 1, name: 'ds1' }),
    createDatasource: vi.fn().mockResolvedValue({ id: 2 }),
    updateDatasource: vi.fn().mockResolvedValue({ id: 1 }),
    archiveDatasource: vi.fn().mockResolvedValue(undefined),
    testDatasource: vi.fn().mockResolvedValue(undefined),
    introspectDatasource: vi.fn().mockResolvedValue({ schema: [] }),
    validateDatasourceQuery: vi.fn().mockResolvedValue(undefined),
    previewDatasourceQuery: vi.fn().mockResolvedValue({ result: [] }),
    setDefaultDatasource: vi.fn().mockResolvedValue(undefined),
    getDatasourceSchema: vi.fn().mockResolvedValue({ tables: [] }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(datasourcesCommand);
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

  it('should list datasources', async () => {
    await datasourcesCommand.parseAsync(['node', 'test', 'list']);

    expect(mockClient.listDatasources).toHaveBeenCalled();
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should get datasource by id', async () => {
    await datasourcesCommand.parseAsync(['node', 'test', 'get', '1']);

    expect(mockClient.getDatasource).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should create a datasource', async () => {
    await datasourcesCommand.parseAsync([
      'node',
      'test',
      'create',
      '--config',
      '{"type":"clickhouse"}',
    ]);

    expect(mockClient.createDatasource).toHaveBeenCalledWith({ type: 'clickhouse' });
  });

  it('should update a datasource', async () => {
    await datasourcesCommand.parseAsync([
      'node',
      'test',
      'update',
      '1',
      '--config',
      '{"type":"clickhouse"}',
    ]);

    expect(mockClient.updateDatasource).toHaveBeenCalledWith(1, { type: 'clickhouse' });
  });

  it('should archive a datasource', async () => {
    await datasourcesCommand.parseAsync(['node', 'test', 'archive', '1']);

    expect(mockClient.archiveDatasource).toHaveBeenCalledWith(1, false);
  });

  it('should unarchive a datasource', async () => {
    await datasourcesCommand.parseAsync(['node', 'test', 'archive', '1', '--unarchive']);

    expect(mockClient.archiveDatasource).toHaveBeenCalledWith(1, true);
  });

  it('should test a datasource', async () => {
    await datasourcesCommand.parseAsync([
      'node',
      'test',
      'test',
      '--config',
      '{"type":"clickhouse"}',
    ]);

    expect(mockClient.testDatasource).toHaveBeenCalledWith({ type: 'clickhouse' });
  });

  it('should introspect a datasource', async () => {
    await datasourcesCommand.parseAsync([
      'node',
      'test',
      'introspect',
      '--config',
      '{"type":"clickhouse"}',
    ]);

    expect(mockClient.introspectDatasource).toHaveBeenCalledWith({ type: 'clickhouse' });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should validate a datasource query', async () => {
    await datasourcesCommand.parseAsync([
      'node',
      'test',
      'validate-query',
      '--config',
      '{"query":"SELECT 1"}',
    ]);

    expect(mockClient.validateDatasourceQuery).toHaveBeenCalledWith({ query: 'SELECT 1' });
  });

  it('should preview a datasource query', async () => {
    await datasourcesCommand.parseAsync([
      'node',
      'test',
      'preview-query',
      '--config',
      '{"query":"SELECT 1"}',
    ]);

    expect(mockClient.previewDatasourceQuery).toHaveBeenCalledWith({ query: 'SELECT 1' });
    expect(printFormatted).toHaveBeenCalled();
  });

  it('should set default datasource', async () => {
    await datasourcesCommand.parseAsync(['node', 'test', 'set-default', '1']);

    expect(mockClient.setDefaultDatasource).toHaveBeenCalledWith(1);
  });

  it('should get datasource schema', async () => {
    await datasourcesCommand.parseAsync(['node', 'test', 'schema', '1']);

    expect(mockClient.getDatasourceSchema).toHaveBeenCalledWith(1);
    expect(printFormatted).toHaveBeenCalled();
  });
});
