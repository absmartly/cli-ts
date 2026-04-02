import type { APIClient } from '../../api-client/api-client.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface UpdateMetricParams {
  id: MetricId;
  description?: string | undefined;
}

export async function updateMetric(
  client: APIClient,
  params: UpdateMetricParams,
): Promise<CommandResult<void>> {
  const data: Record<string, string> = {};
  if (params.description !== undefined) data.description = params.description;

  if (Object.keys(data).length === 0) {
    throw new Error('At least one update field is required');
  }

  await client.updateMetric(params.id, data);
  return { data: undefined };
}
