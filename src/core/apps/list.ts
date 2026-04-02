import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListAppsParams {
  items: number;
  page: number;
}

export async function listApps(
  client: APIClient,
  params: ListAppsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listApplications(params.items, params.page);
  return { data };
}
