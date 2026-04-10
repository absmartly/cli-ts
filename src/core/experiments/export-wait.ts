import type { APIClient } from '../../api-client/api-client.js';
import type { ExperimentId } from '../../api-client/types.js';
import type {
  ExportConfigId,
  ExportConfigShape,
  ExportHistoryShape,
  ExportHistoryStatus,
} from '../../lib/api/branded-types.js';

export interface ExportStatus {
  exportConfig: ExportConfigShape;
  latestHistory: ExportHistoryShape | null;
  status: ExportHistoryStatus | 'UNKNOWN';
  progress: number;
  exportedRows: number;
  totalRows: number;
  remainingSeconds: number;
  isTerminal: boolean;
  downloadUrl: string | null;
}

const TERMINAL_STATUSES: ExportHistoryStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

const ATTACHABLE_STATUSES = 'WAITING,IN_PROGRESS,RETRYING,COMPLETED';

export async function findActiveExportConfig(
  client: APIClient,
  experimentId: ExperimentId
): Promise<ExportConfigShape | null> {
  // Try active exports first, then include completed (for "recently created" case
  // where the export finished but download_file_key isn't set yet)
  const configs = await client.listExportConfigs({ statuses: ATTACHABLE_STATUSES });
  const matches = configs.filter((c) => c.experiment_id === (experimentId as number));
  if (matches.length === 0) return null;
  // Prefer active over completed, and most recent within each group
  return (
    matches.find((c) => !c.download_file_key) ??
    matches[matches.length - 1]!
  );
}

export async function fetchExportStatus(
  client: APIClient,
  exportConfigId: ExportConfigId
): Promise<ExportStatus> {
  const [exportConfig, histories] = await Promise.all([
    client.getExportConfig(exportConfigId),
    client.listExportHistories(exportConfigId),
  ]);

  const latestHistory: ExportHistoryShape | null =
    histories.length > 0 ? histories[histories.length - 1]! : null;
  const status: ExportHistoryStatus | 'UNKNOWN' = latestHistory?.status ?? 'UNKNOWN';
  const isTerminal =
    TERMINAL_STATUSES.includes(status as ExportHistoryStatus) &&
    !(status === 'COMPLETED' && !exportConfig.download_file_key);

  let downloadUrl: string | null = null;
  if (status === 'COMPLETED' && exportConfig.download_file_key) {
    const baseUrl = client.getApiBaseUrl();
    downloadUrl = `${baseUrl}/experiments/exports/${exportConfigId}/${exportConfig.download_file_key}`;
  }

  return {
    exportConfig,
    latestHistory,
    status,
    progress: latestHistory?.progress ?? 0,
    exportedRows: latestHistory?.exported_rows ?? 0,
    totalRows: latestHistory?.total_rows ?? 0,
    remainingSeconds: latestHistory?.remaining_seconds ?? 0,
    isTerminal,
    downloadUrl,
  };
}
