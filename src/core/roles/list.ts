import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListRolesParams {
  items: number;
  page: number;
}

export async function listRoles(
  client: APIClient,
  params: ListRolesParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listRoles(params.items, params.page);
  return { data };
}
