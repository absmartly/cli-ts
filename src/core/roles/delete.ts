import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { RoleId } from '../../lib/api/branded-types.js';

export interface DeleteRoleParams {
  id: RoleId;
}

export async function deleteRole(
  client: APIClient,
  params: DeleteRoleParams
): Promise<CommandResult<unknown>> {
  await client.deleteRole(params.id);
  return { data: { id: params.id } };
}
