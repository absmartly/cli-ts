import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchExportStatus, findActiveExportConfig, findRecentDownload } from './export-wait.js';
import type { ExportConfigId, ExperimentId } from '../../lib/api/branded-types.js';

const configId = 99 as unknown as ExportConfigId;
const experimentId = 42 as unknown as ExperimentId;

describe('fetchExportStatus', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockClient = {
      getExportConfig: vi.fn(),
      listExportHistories: vi.fn(),
      listExportConfigs: vi.fn(),
      getApiBaseUrl: vi.fn().mockReturnValue('https://api.example.com/v1'),
    };
  });

  it('should return COMPLETED with download URL when file key is present', async () => {
    mockClient.getExportConfig.mockResolvedValue({
      id: 99,
      experiment_id: 42,
      download_file_key: 'export.zip',
      download_created_at: '2026-01-01T00:00:00Z',
      downloadable: true,
    });
    mockClient.listExportHistories.mockResolvedValue([
      { id: 1, status: 'COMPLETED', progress: 100, exported_rows: 5000, total_rows: 5000, remaining_seconds: 0 },
    ]);

    const result = await fetchExportStatus(mockClient as any, configId);

    expect(result.status).toBe('COMPLETED');
    expect(result.isTerminal).toBe(true);
    expect(result.progress).toBe(100);
    expect(result.exportedRows).toBe(5000);
    expect(result.downloadUrl).toBe('https://api.example.com/v1/experiments/exports/99/export.zip');
  });

  it('should return isTerminal false when COMPLETED but no download_file_key yet', async () => {
    mockClient.getExportConfig.mockResolvedValue({
      id: 99,
      experiment_id: 42,
    });
    mockClient.listExportHistories.mockResolvedValue([
      { id: 1, status: 'COMPLETED', progress: 100, exported_rows: 0, total_rows: 0, remaining_seconds: 0 },
    ]);

    const result = await fetchExportStatus(mockClient as any, configId);

    expect(result.status).toBe('COMPLETED');
    expect(result.isTerminal).toBe(false);
    expect(result.downloadUrl).toBeNull();
  });

  it('should return isTerminal true for FAILED', async () => {
    mockClient.getExportConfig.mockResolvedValue({ id: 99, experiment_id: 42 });
    mockClient.listExportHistories.mockResolvedValue([
      { id: 1, status: 'FAILED', progress: 0, exported_rows: 0, total_rows: 0, remaining_seconds: 0 },
    ]);

    const result = await fetchExportStatus(mockClient as any, configId);

    expect(result.status).toBe('FAILED');
    expect(result.isTerminal).toBe(true);
    expect(result.downloadUrl).toBeNull();
  });

  it('should return isTerminal true for CANCELLED', async () => {
    mockClient.getExportConfig.mockResolvedValue({ id: 99, experiment_id: 42 });
    mockClient.listExportHistories.mockResolvedValue([
      { id: 1, status: 'CANCELLED', progress: 0, exported_rows: 0, total_rows: 0, remaining_seconds: 0 },
    ]);

    const result = await fetchExportStatus(mockClient as any, configId);

    expect(result.status).toBe('CANCELLED');
    expect(result.isTerminal).toBe(true);
  });

  it('should return isTerminal false for IN_PROGRESS', async () => {
    mockClient.getExportConfig.mockResolvedValue({ id: 99, experiment_id: 42 });
    mockClient.listExportHistories.mockResolvedValue([
      { id: 1, status: 'IN_PROGRESS', progress: 45, exported_rows: 2250, total_rows: 5000, remaining_seconds: 30 },
    ]);

    const result = await fetchExportStatus(mockClient as any, configId);

    expect(result.status).toBe('IN_PROGRESS');
    expect(result.isTerminal).toBe(false);
    expect(result.progress).toBe(45);
    expect(result.exportedRows).toBe(2250);
    expect(result.totalRows).toBe(5000);
    expect(result.remainingSeconds).toBe(30);
    expect(result.downloadUrl).toBeNull();
  });

  it('should return isTerminal false for WAITING', async () => {
    mockClient.getExportConfig.mockResolvedValue({ id: 99, experiment_id: 42 });
    mockClient.listExportHistories.mockResolvedValue([
      { id: 1, status: 'WAITING', progress: 0, exported_rows: 0, total_rows: 0, remaining_seconds: 0 },
    ]);

    const result = await fetchExportStatus(mockClient as any, configId);

    expect(result.status).toBe('WAITING');
    expect(result.isTerminal).toBe(false);
  });

  it('should return isTerminal false for RETRYING', async () => {
    mockClient.getExportConfig.mockResolvedValue({ id: 99, experiment_id: 42 });
    mockClient.listExportHistories.mockResolvedValue([
      { id: 1, status: 'RETRYING', progress: 0, exported_rows: 0, total_rows: 0, remaining_seconds: 0 },
    ]);

    const result = await fetchExportStatus(mockClient as any, configId);

    expect(result.status).toBe('RETRYING');
    expect(result.isTerminal).toBe(false);
  });

  it('should handle empty export histories', async () => {
    mockClient.getExportConfig.mockResolvedValue({ id: 99, experiment_id: 42 });
    mockClient.listExportHistories.mockResolvedValue([]);

    const result = await fetchExportStatus(mockClient as any, configId);

    expect(result.status).toBe('UNKNOWN');
    expect(result.isTerminal).toBe(false);
    expect(result.latestHistory).toBeNull();
    expect(result.progress).toBe(0);
    expect(result.downloadUrl).toBeNull();
  });

  it('should use the last history entry as the latest', async () => {
    mockClient.getExportConfig.mockResolvedValue({ id: 99, experiment_id: 42 });
    mockClient.listExportHistories.mockResolvedValue([
      { id: 1, status: 'FAILED', progress: 0, exported_rows: 0, total_rows: 0, remaining_seconds: 0 },
      { id: 2, status: 'IN_PROGRESS', progress: 50, exported_rows: 2500, total_rows: 5000, remaining_seconds: 15 },
    ]);

    const result = await fetchExportStatus(mockClient as any, configId);

    expect(result.status).toBe('IN_PROGRESS');
    expect(result.latestHistory?.id).toBe(2);
    expect(result.progress).toBe(50);
  });
});

describe('findActiveExportConfig', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockClient = {
      listExportConfigs: vi.fn(),
    };
  });

  it('should return the matching config for the experiment', async () => {
    mockClient.listExportConfigs.mockResolvedValue([
      { id: 10, experiment_id: 99 },
      { id: 20, experiment_id: 42 },
    ]);

    const result = await findActiveExportConfig(mockClient as any, experimentId);

    expect(mockClient.listExportConfigs).toHaveBeenCalledWith({
      statuses: 'WAITING,IN_PROGRESS,RETRYING,COMPLETED',
    });
    expect(result).toEqual({ id: 20, experiment_id: 42 });
  });

  it('should prefer config without download_file_key', async () => {
    mockClient.listExportConfigs.mockResolvedValue([
      { id: 10, experiment_id: 42, download_file_key: 'old.zip' },
      { id: 20, experiment_id: 42 },
    ]);

    const result = await findActiveExportConfig(mockClient as any, experimentId);

    expect(result).toEqual({ id: 20, experiment_id: 42 });
  });

  it('should fall back to latest config if all have download_file_key', async () => {
    mockClient.listExportConfigs.mockResolvedValue([
      { id: 10, experiment_id: 42, download_file_key: 'old.zip' },
      { id: 20, experiment_id: 42, download_file_key: 'new.zip' },
    ]);

    const result = await findActiveExportConfig(mockClient as any, experimentId);

    expect(result).toEqual({ id: 20, experiment_id: 42, download_file_key: 'new.zip' });
  });

  it('should return null when no config matches the experiment', async () => {
    mockClient.listExportConfigs.mockResolvedValue([
      { id: 10, experiment_id: 99 },
    ]);

    const result = await findActiveExportConfig(mockClient as any, experimentId);

    expect(result).toBeNull();
  });

  it('should return null when no active configs exist', async () => {
    mockClient.listExportConfigs.mockResolvedValue([]);

    const result = await findActiveExportConfig(mockClient as any, experimentId);

    expect(result).toBeNull();
  });
});

describe('findRecentDownload', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockClient = {
      listExportConfigs: vi.fn(),
      getApiBaseUrl: vi.fn().mockReturnValue('https://api.example.com/v1'),
    };
  });

  it('should return the most recent completed download', async () => {
    mockClient.listExportConfigs.mockResolvedValue([
      {
        id: 10,
        experiment_id: 42,
        download_file_key: 'old.zip',
        download_created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 20,
        experiment_id: 42,
        download_file_key: 'new.zip',
        download_created_at: '2026-01-02T00:00:00Z',
      },
    ]);

    const result = await findRecentDownload(mockClient as any, experimentId);

    expect(result).toEqual({
      exportConfigId: 20,
      downloadUrl: 'https://api.example.com/v1/experiments/exports/20/new.zip',
      downloadCreatedAt: '2026-01-02T00:00:00Z',
    });
  });

  it('should skip configs with download_deleted_at', async () => {
    mockClient.listExportConfigs.mockResolvedValue([
      {
        id: 10,
        experiment_id: 42,
        download_file_key: 'expired.zip',
        download_created_at: '2026-01-02T00:00:00Z',
        download_deleted_at: '2026-01-03T00:00:00Z',
      },
      {
        id: 20,
        experiment_id: 42,
        download_file_key: 'valid.zip',
        download_created_at: '2026-01-01T00:00:00Z',
      },
    ]);

    const result = await findRecentDownload(mockClient as any, experimentId);

    expect(result!.exportConfigId).toBe(20);
  });

  it('should return null when no downloads match', async () => {
    mockClient.listExportConfigs.mockResolvedValue([
      { id: 10, experiment_id: 99, download_file_key: 'other.zip', download_created_at: '2026-01-01T00:00:00Z' },
    ]);

    const result = await findRecentDownload(mockClient as any, experimentId);

    expect(result).toBeNull();
  });

  it('should return null for empty list', async () => {
    mockClient.listExportConfigs.mockResolvedValue([]);

    const result = await findRecentDownload(mockClient as any, experimentId);

    expect(result).toBeNull();
  });
});
