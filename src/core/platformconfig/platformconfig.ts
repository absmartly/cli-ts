import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export async function listPlatformConfigs(client: APIClient): Promise<CommandResult<unknown>> {
  const data = await client.listPlatformConfigs();
  return { data };
}

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
