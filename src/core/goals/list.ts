import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListGoalsParams {
  items: number;
  page: number;
}

export async function listGoals(
  client: APIClient,
  params: ListGoalsParams,
): Promise<CommandResult<unknown[]>> {
  const data = await client.listGoals(params.items, params.page);
  return {
    data,
    pagination: { page: params.page, items: params.items, hasMore: data.length >= params.items },
  };
}
