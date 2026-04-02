import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListMetricTagsParams {
  items: number;
  page: number;
}

export async function listMetricTags(
  client: APIClient,
  params: ListMetricTagsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listMetricTags(params.items, params.page);
  return { data };
}
