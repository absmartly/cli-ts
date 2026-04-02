import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface GetStorageConfigParams {
  id: number;
}

export async function getStorageConfig(
  client: APIClient,
  params: GetStorageConfigParams
): Promise<CommandResult<unknown>> {
  const data = await client.getStorageConfig(params.id);
  return { data };
}
