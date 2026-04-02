import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { AssetRoleId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface UpdateAssetRoleParams {
  id: AssetRoleId;
  name?: string | undefined;
}

export async function updateAssetRole(
  client: APIClient,
  params: UpdateAssetRoleParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, unknown> = {};
  if (params.name !== undefined) data.name = params.name;

  requireAtLeastOneField(data, 'update field');
  await client.updateAssetRole(params.id, data);
  return { data: { id: params.id } };
}
