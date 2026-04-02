import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { RoleId } from '../../lib/api/branded-types.js';

export interface GetRoleParams {
  id: RoleId;
}

export async function getRole(
  client: APIClient,
  params: GetRoleParams
): Promise<CommandResult<unknown>> {
  const data = await client.getRole(params.id);
  return { data };
}
