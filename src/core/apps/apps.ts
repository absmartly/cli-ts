import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ApplicationId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface ListAppsParams {
  items: number;
  page: number;
}

export async function listApps(
  client: APIClient,
  params: ListAppsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listApplications({ items: params.items, page: params.page });
  return { data };
}

export interface GetAppParams {
  id: ApplicationId;
}

export async function getApp(
  client: APIClient,
  params: GetAppParams
): Promise<CommandResult<unknown>> {
  const data = await client.getApplication(params.id);
  return { data };
}

export interface CreateAppParams {
  name: string;
}

export async function createApp(
  client: APIClient,
  params: CreateAppParams
): Promise<CommandResult<unknown>> {
  const data = await client.createApplication({ name: params.name });
  return { data };
}

export interface UpdateAppParams {
  id: ApplicationId;
  name?: string | undefined;
}

export async function updateApp(
  client: APIClient,
  params: UpdateAppParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, unknown> = {};
  if (params.name) data.name = params.name;

  requireAtLeastOneField(data, 'update field');
  await client.updateApplication(params.id, data);
  return { data: { id: params.id } };
}

export interface ArchiveAppParams {
  id: ApplicationId;
  unarchive?: boolean | undefined;
}

export async function archiveApp(
  client: APIClient,
  params: ArchiveAppParams
): Promise<CommandResult<unknown>> {
  await client.archiveApplication(params.id, params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}
