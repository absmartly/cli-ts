import type { APIClient } from '../../api-client/api-client.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface ArchiveMetricParams {
  id: MetricId;
  unarchive?: boolean | undefined;
}

export async function archiveMetric(
  client: APIClient,
  params: ArchiveMetricParams,
): Promise<CommandResult<void>> {
  await client.archiveMetric(params.id, params.unarchive);
  return { data: undefined };
}
