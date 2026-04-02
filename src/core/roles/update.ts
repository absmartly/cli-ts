import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { RoleId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface UpdateRoleParams {
  id: RoleId;
  name?: string | undefined;
  description?: string | undefined;
}

export async function updateRole(
  client: APIClient,
  params: UpdateRoleParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, string> = {};
  if (params.name !== undefined) data.name = params.name;
  if (params.description !== undefined) data.description = params.description;

  requireAtLeastOneField(data, 'update field');
  await client.updateRole(params.id, data);
  return { data: { id: params.id } };
}
