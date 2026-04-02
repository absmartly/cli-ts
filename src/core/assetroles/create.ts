import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateAssetRoleParams {
  name: string;
}

export async function createAssetRole(
  client: APIClient,
  params: CreateAssetRoleParams
): Promise<CommandResult<unknown>> {
  const data = await client.createAssetRole({ name: params.name });
  return { data };
}
