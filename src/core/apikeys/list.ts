import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListApiKeysParams {
  items: number;
  page: number;
}

export async function listApiKeys(
  client: APIClient,
  params: ListApiKeysParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listApiKeys(params.items, params.page);
  return { data };
}
