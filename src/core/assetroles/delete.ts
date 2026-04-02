import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { AssetRoleId } from '../../lib/api/branded-types.js';

export interface DeleteAssetRoleParams {
  id: AssetRoleId;
}

export async function deleteAssetRole(
  client: APIClient,
  params: DeleteAssetRoleParams
): Promise<CommandResult<unknown>> {
  await client.deleteAssetRole(params.id);
  return { data: { id: params.id } };
}
