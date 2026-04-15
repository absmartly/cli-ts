import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { EnvironmentId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface ListEnvsParams {
  items: number;
  page: number;
}

export async function listEnvs(
  client: APIClient,
  params: ListEnvsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listEnvironments({ items: params.items, page: params.page });
  return { data };
}

export interface GetEnvParams {
  id: EnvironmentId;
}

export async function getEnv(
  client: APIClient,
  params: GetEnvParams
): Promise<CommandResult<unknown>> {
  const data = await client.getEnvironment(params.id);
  return { data };
}

export interface CreateEnvParams {
  name: string;
}

export async function createEnv(
  client: APIClient,
  params: CreateEnvParams
): Promise<CommandResult<unknown>> {
  const data = await client.createEnvironment({ name: params.name });
  return { data };
}

export interface UpdateEnvParams {
  id: EnvironmentId;
  name?: string | undefined;
}

export async function updateEnv(
  client: APIClient,
  params: UpdateEnvParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, unknown> = {};
  if (params.name !== undefined) data.name = params.name;

  requireAtLeastOneField(data, 'update field');
  await client.updateEnvironment(params.id, data);
  return { data: { id: params.id } };
}

export interface ArchiveEnvParams {
  id: EnvironmentId;
  unarchive?: boolean | undefined;
}

export async function archiveEnv(
  client: APIClient,
  params: ArchiveEnvParams
): Promise<CommandResult<unknown>> {
  await client.archiveEnvironment(params.id, params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}
