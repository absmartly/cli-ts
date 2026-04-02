import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export async function listPermissions(
  client: APIClient
): Promise<CommandResult<unknown>> {
  const data = await client.listPermissions();
  return { data };
}

export async function listPermissionCategories(
  client: APIClient
): Promise<CommandResult<unknown>> {
  const data = await client.listPermissionCategories();
  return { data };
}

export async function listAccessControlPolicies(
  client: APIClient
): Promise<CommandResult<unknown>> {
  const data = await client.listAccessControlPolicies();
  return { data };
}
