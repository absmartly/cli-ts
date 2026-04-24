import type { APIClient } from '../../api-client/api-client.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface UpdateMetricParams {
  id: MetricId;
  name?: string | undefined;
  description?: string | undefined;
  owner?: number | undefined;
}

export async function updateMetric(
  client: APIClient,
  params: UpdateMetricParams
): Promise<CommandResult<void>> {
  const data: Record<string, unknown> = {};
  if (params.name !== undefined) data.name = params.name;
  if (params.description !== undefined) data.description = params.description;
  if (params.owner !== undefined) data.owners = [{ user_id: params.owner }];

  if (Object.keys(data).length === 0) {
    throw new Error('At least one update field is required');
  }

  await client.updateMetric(params.id, data);
  return { data: undefined };
}
