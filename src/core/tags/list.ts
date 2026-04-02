import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListTagsParams {
  items: number;
  page: number;
}

export async function listTags(
  client: APIClient,
  params: ListTagsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listExperimentTags(params.items, params.page);
  return { data };
}
