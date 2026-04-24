import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import { buildMetricPayload, validateMetricFields, type MetricFields } from './payload.js';

export interface CreateMetricParams extends MetricFields {
  name: string;
  type: string;
  description: string;
}

export async function createMetric(
  client: APIClient,
  params: CreateMetricParams
): Promise<CommandResult<{ id: number }>> {
  validateMetricFields(params, { mode: 'strict' });
  const payload = buildMetricPayload(params);
  const data = await client.createMetric(payload);
  return { data: data as { id: number } };
}
