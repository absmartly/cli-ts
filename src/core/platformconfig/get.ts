import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface GetPlatformConfigParams {
  id: number;
}

export async function getPlatformConfig(
  client: APIClient,
  params: GetPlatformConfigParams
): Promise<CommandResult<unknown>> {
  const data = await client.getPlatformConfig(params.id);
  return { data };
}
