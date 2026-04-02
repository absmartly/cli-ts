import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';

export interface GetMetricCategoryParams {
  id: TagId;
}

export async function getMetricCategory(
  client: APIClient,
  params: GetMetricCategoryParams
): Promise<CommandResult<unknown>> {
  const data = await client.getMetricCategory(params.id);
  return { data };
}
