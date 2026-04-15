import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface ListGoalTagsParams {
  items: number;
  page: number;
}

export async function listGoalTags(
  client: APIClient,
  params: ListGoalTagsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listGoalTags({ items: params.items, page: params.page });
  return { data };
}

export interface GetGoalTagParams {
  id: TagId;
}

export async function getGoalTag(
  client: APIClient,
  params: GetGoalTagParams
): Promise<CommandResult<unknown>> {
  const data = await client.getGoalTag(params.id);
  return { data };
}

export interface CreateGoalTagParams {
  tag: string;
}

export async function createGoalTag(
  client: APIClient,
  params: CreateGoalTagParams
): Promise<CommandResult<unknown>> {
  const data = await client.createGoalTag({ tag: params.tag });
  return { data };
}

export interface UpdateGoalTagParams {
  id: TagId;
  tag?: string | undefined;
}

export async function updateGoalTag(
  client: APIClient,
  params: UpdateGoalTagParams
): Promise<CommandResult<unknown>> {
  const data: { tag?: string } = {};
  if (params.tag) data.tag = params.tag;

  requireAtLeastOneField(data, 'update field');
  const result = await client.updateGoalTag(params.id, data as { tag: string });
  return { data: result };
}

export interface DeleteGoalTagParams {
  id: TagId;
}

export async function deleteGoalTag(
  client: APIClient,
  params: DeleteGoalTagParams
): Promise<CommandResult<unknown>> {
  await client.deleteGoalTag(params.id);
  return { data: { id: params.id } };
}
