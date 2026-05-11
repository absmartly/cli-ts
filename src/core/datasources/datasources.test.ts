import { describe, it, expect, vi } from 'vitest';
import {
  listDatasources,
  getDatasource,
  createDatasource,
  updateDatasource,
  archiveDatasource,
  testDatasource,
  introspectDatasource,
  validateDatasourceQuery,
  previewDatasourceQuery,
  setDefaultDatasource,
  getDatasourceSchema,
  deleteDatasource,
} from './datasources.js';

describe('datasources', () => {
  const mockClient = {
    listDatasources: vi.fn(),
    getDatasource: vi.fn(),
    createDatasource: vi.fn(),
    updateDatasource: vi.fn(),
    archiveDatasource: vi.fn(),
    testDatasource: vi.fn(),
    introspectDatasource: vi.fn(),
    validateDatasourceQuery: vi.fn(),
    previewDatasourceQuery: vi.fn(),
    setDefaultDatasource: vi.fn(),
    getDatasourceSchema: vi.fn(),
    deleteDatasource: vi.fn(),
  };

  it('should list datasources', async () => {
    mockClient.listDatasources.mockResolvedValue([{ id: 1 }]);
    const result = await listDatasources(mockClient as any);
    expect(mockClient.listDatasources).toHaveBeenCalled();
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should get datasource by id', async () => {
    mockClient.getDatasource.mockResolvedValue({ id: 1, name: 'test' });
    const result = await getDatasource(mockClient as any, { id: 1 as any });
    expect(mockClient.getDatasource).toHaveBeenCalledWith(1);
    expect(result.data).toEqual({ id: 1, name: 'test' });
  });

  it('should create datasource', async () => {
    const config = { name: 'new', type: 'postgres' };
    mockClient.createDatasource.mockResolvedValue({ id: 2, ...config });
    const result = await createDatasource(mockClient as any, { config });
    expect(mockClient.createDatasource).toHaveBeenCalledWith(config);
    expect(result.data).toEqual({ id: 2, ...config });
  });

  it('should update datasource', async () => {
    const config = { name: 'updated' };
    mockClient.updateDatasource.mockResolvedValue({ id: 1, ...config });
    const result = await updateDatasource(mockClient as any, { id: 1 as any, config });
    expect(mockClient.updateDatasource).toHaveBeenCalledWith(1, config);
    expect(result.data).toEqual({ id: 1, ...config });
  });

  it('should archive datasource', async () => {
    mockClient.archiveDatasource.mockResolvedValue(undefined);
    const result = await archiveDatasource(mockClient as any, { id: 1 as any });
    expect(mockClient.archiveDatasource).toHaveBeenCalledWith(1, undefined);
    expect(result.data).toBeUndefined();
  });

  it('should unarchive datasource', async () => {
    mockClient.archiveDatasource.mockResolvedValue(undefined);
    const result = await archiveDatasource(mockClient as any, { id: 1 as any, unarchive: true });
    expect(mockClient.archiveDatasource).toHaveBeenCalledWith(1, true);
    expect(result.data).toBeUndefined();
  });

  it('should test datasource', async () => {
    mockClient.testDatasource.mockResolvedValue(undefined);
    const config = { host: 'localhost' };
    const result = await testDatasource(mockClient as any, { config });
    expect(mockClient.testDatasource).toHaveBeenCalledWith(config);
    expect(result.data).toBeUndefined();
  });

  it('should introspect datasource', async () => {
    const schema = { tables: ['users'] };
    mockClient.introspectDatasource.mockResolvedValue(schema);
    const config = { host: 'localhost' };
    const result = await introspectDatasource(mockClient as any, { config });
    expect(mockClient.introspectDatasource).toHaveBeenCalledWith(config);
    expect(result.data).toEqual(schema);
  });

  it('should validate datasource query', async () => {
    mockClient.validateDatasourceQuery.mockResolvedValue(undefined);
    const config = { query: 'SELECT 1' };
    const result = await validateDatasourceQuery(mockClient as any, { config });
    expect(mockClient.validateDatasourceQuery).toHaveBeenCalledWith(config);
    expect(result.data).toBeUndefined();
  });

  it('should preview datasource query', async () => {
    const preview = { rows: [{ id: 1 }] };
    mockClient.previewDatasourceQuery.mockResolvedValue(preview);
    const config = { query: 'SELECT 1' };
    const result = await previewDatasourceQuery(mockClient as any, { config });
    expect(mockClient.previewDatasourceQuery).toHaveBeenCalledWith(config);
    expect(result.data).toEqual(preview);
  });

  it('should set default datasource', async () => {
    mockClient.setDefaultDatasource.mockResolvedValue(undefined);
    const result = await setDefaultDatasource(mockClient as any, { id: 1 as any });
    expect(mockClient.setDefaultDatasource).toHaveBeenCalledWith(1);
    expect(result.data).toBeUndefined();
  });

  it('should get datasource schema', async () => {
    const schema = { tables: ['users'] };
    mockClient.getDatasourceSchema.mockResolvedValue(schema);
    const result = await getDatasourceSchema(mockClient as any, { id: 1 as any });
    expect(mockClient.getDatasourceSchema).toHaveBeenCalledWith(1);
    expect(result.data).toEqual(schema);
  });

  it('should delete datasource', async () => {
    mockClient.deleteDatasource.mockResolvedValue(undefined);
    const result = await deleteDatasource(mockClient as any, { id: 1 as any });
    expect(mockClient.deleteDatasource).toHaveBeenCalledWith(1);
    expect(result.data).toBeUndefined();
  });
});
