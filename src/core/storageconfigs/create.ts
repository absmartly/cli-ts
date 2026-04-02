import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateStorageConfigParams {
  config: Record<string, unknown>;
}

export async function createStorageConfig(
  client: APIClient,
  params: CreateStorageConfigParams
): Promise<CommandResult<unknown>> {
  const data = await client.createStorageConfig(params.config);
  return { data };
}
