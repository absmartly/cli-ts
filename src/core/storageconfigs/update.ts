import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface UpdateStorageConfigParams {
  id: number;
  config: Record<string, unknown>;
}

export async function updateStorageConfig(
  client: APIClient,
  params: UpdateStorageConfigParams
): Promise<CommandResult<unknown>> {
  const data = await client.updateStorageConfig(params.id, params.config);
  return { data };
}
