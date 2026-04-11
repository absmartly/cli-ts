import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface ListMetricTagsParams {
  items: number;
  page: number;
}

export async function listMetricTags(
  client: APIClient,
  params: ListMetricTagsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listMetricTags(params.items, params.page);
  return { data };
}

export interface GetMetricTagParams {
  id: TagId;
}

export async function getMetricTag(
  client: APIClient,
  params: GetMetricTagParams
): Promise<CommandResult<unknown>> {
  const data = await client.getMetricTag(params.id);
  return { data };
}

export interface CreateMetricTagParams {
  tag: string;
}

export async function createMetricTag(
  client: APIClient,
  params: CreateMetricTagParams
): Promise<CommandResult<unknown>> {
  const data = await client.createMetricTag({ tag: params.tag });
  return { data };
}

export interface UpdateMetricTagParams {
  id: TagId;
  tag?: string | undefined;
}

export async function updateMetricTag(
  client: APIClient,
  params: UpdateMetricTagParams
): Promise<CommandResult<unknown>> {
  const data: { tag?: string } = {};
  if (params.tag) data.tag = params.tag;

  requireAtLeastOneField(data, 'update field');
  const result = await client.updateMetricTag(params.id, data as { tag: string });
  return { data: result };
}

export interface DeleteMetricTagParams {
  id: TagId;
}

export async function deleteMetricTag(
  client: APIClient,
  params: DeleteMetricTagParams
): Promise<CommandResult<unknown>> {
  await client.deleteMetricTag(params.id);
  return { data: { id: params.id } };
}
