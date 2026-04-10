import type { APIClient } from '../../api-client/api-client.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface GetMetricParams {
  id: MetricId;
}

export async function getMetric(
  client: APIClient,
  params: GetMetricParams
): Promise<CommandResult<unknown>> {
  const data = await client.getMetric(params.id);
  return { data };
}
