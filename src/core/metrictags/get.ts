import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';

export interface GetMetricTagParams {
  id: TagId;
}

export async function getMetricTag(
  client: APIClient,
  params: GetMetricTagParams
): Promise<CommandResult<unknown>> {
  const data = await client.getMetricTag(params.id);
  return { data };
}
