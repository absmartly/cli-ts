import type { APIClient } from '../../api-client/api-client.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface ActivateMetricParams {
  id: MetricId;
  reason: string;
}

export async function activateMetric(
  client: APIClient,
  params: ActivateMetricParams,
): Promise<CommandResult<void>> {
  await client.activateMetric(params.id, params.reason);
  return { data: undefined };
}
