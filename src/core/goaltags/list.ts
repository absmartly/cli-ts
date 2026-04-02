import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListGoalTagsParams {
  items: number;
  page: number;
}

export async function listGoalTags(
  client: APIClient,
  params: ListGoalTagsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listGoalTags(params.items, params.page);
  return { data };
}
