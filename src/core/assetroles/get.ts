import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { AssetRoleId } from '../../lib/api/branded-types.js';

export interface GetAssetRoleParams {
  id: AssetRoleId;
}

export async function getAssetRole(
  client: APIClient,
  params: GetAssetRoleParams
): Promise<CommandResult<unknown>> {
  const data = await client.getAssetRole(params.id);
  return { data };
}
