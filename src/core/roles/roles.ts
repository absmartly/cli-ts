import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { RoleId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface ListRolesParams {
  items: number;
  page: number;
}

export async function listRoles(
  client: APIClient,
  params: ListRolesParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listRoles({ items: params.items, page: params.page });
  return { data };
}

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

export interface CreateRoleParams {
  name: string;
  description?: string | undefined;
}

export async function createRole(
  client: APIClient,
  params: CreateRoleParams
): Promise<CommandResult<unknown>> {
  const payload: Record<string, unknown> = { name: params.name };
  if (params.description !== undefined) payload.description = params.description;
  const data = await client.createRole(payload);
  return { data };
}

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
