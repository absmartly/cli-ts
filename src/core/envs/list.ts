import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListEnvsParams {
  items: number;
  page: number;
}

export async function listEnvs(
  client: APIClient,
  params: ListEnvsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listEnvironments(params.items, params.page);
  return { data };
}
