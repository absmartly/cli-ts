import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListMetricCategoriesParams {
  items: number;
  page: number;
}

export async function listMetricCategories(
  client: APIClient,
  params: ListMetricCategoriesParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listMetricCategories(params.items, params.page);
  return { data };
}
