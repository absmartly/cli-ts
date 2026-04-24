import type { APIClient } from '../../api-client/api-client.js';
import type { MetricId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';
import { buildMetricPayload, type MetricFields } from './payload.js';

export interface CreateMetricVersionParams extends MetricFields {
  id: MetricId;
  reason?: string | undefined;
}

export async function createMetricVersion(
  client: APIClient,
  params: CreateMetricVersionParams
): Promise<CommandResult<{ id: number; version?: number }>> {
  const { id, reason, ...fields } = params;
  const data = buildMetricPayload(fields);
  const result = await client.createMetricVersion(id, data, reason);
  return { data: result as unknown as { id: number; version?: number } };
}
