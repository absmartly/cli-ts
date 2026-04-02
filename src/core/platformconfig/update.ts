import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface UpdatePlatformConfigParams {
  id: number;
  value: Record<string, unknown>;
}

export async function updatePlatformConfig(
  client: APIClient,
  params: UpdatePlatformConfigParams
): Promise<CommandResult<unknown>> {
  const data = await client.updatePlatformConfig(params.id, params.value);
  return { data };
}
