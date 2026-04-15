import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface ListMetricCategoriesParams {
  items: number;
  page: number;
}

export async function listMetricCategories(
  client: APIClient,
  params: ListMetricCategoriesParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listMetricCategories({ items: params.items, page: params.page });
  return { data };
}

export interface GetMetricCategoryParams {
  id: TagId;
}

export async function getMetricCategory(
  client: APIClient,
  params: GetMetricCategoryParams
): Promise<CommandResult<unknown>> {
  const data = await client.getMetricCategory(params.id);
  return { data };
}

export interface CreateMetricCategoryParams {
  name: string;
  color: string;
  description?: string | undefined;
}

export async function createMetricCategory(
  client: APIClient,
  params: CreateMetricCategoryParams
): Promise<CommandResult<unknown>> {
  const payload: Record<string, unknown> = {
    name: params.name,
    color: params.color,
  };
  if (params.description !== undefined) payload.description = params.description;
  const data = await client.createMetricCategory(
    payload as { name: string; description?: string; color: string }
  );
  return { data };
}

export interface UpdateMetricCategoryParams {
  id: TagId;
  name?: string | undefined;
  description?: string | undefined;
  color?: string | undefined;
}

export async function updateMetricCategory(
  client: APIClient,
  params: UpdateMetricCategoryParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, string> = {};
  if (params.name !== undefined) data.name = params.name;
  if (params.description !== undefined) data.description = params.description;
  if (params.color !== undefined) data.color = params.color;

  requireAtLeastOneField(data, 'update field');
  const result = await client.updateMetricCategory(params.id, data);
  return { data: result };
}

export interface ArchiveMetricCategoryParams {
  id: TagId;
  unarchive?: boolean | undefined;
}

export async function archiveMetricCategory(
  client: APIClient,
  params: ArchiveMetricCategoryParams
): Promise<CommandResult<unknown>> {
  await client.archiveMetricCategory(params.id, !params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}
