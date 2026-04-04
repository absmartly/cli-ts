import type { APIClient } from '../../api-client/api-client.js';
import type { UpdateScheduleId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export async function listUpdateSchedules(
  client: APIClient,
): Promise<CommandResult<unknown>> {
  const data = await client.listUpdateSchedules();
  return { data };
}

export interface GetUpdateScheduleParams {
  id: UpdateScheduleId;
}

export async function getUpdateSchedule(
  client: APIClient,
  params: GetUpdateScheduleParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getUpdateSchedule(params.id);
  return { data };
}

export interface CreateUpdateScheduleParams {
  config: Record<string, unknown>;
}

export async function createUpdateSchedule(
  client: APIClient,
  params: CreateUpdateScheduleParams,
): Promise<CommandResult<unknown>> {
  const data = await client.createUpdateSchedule(params.config);
  return { data };
}

export interface UpdateUpdateScheduleParams {
  id: UpdateScheduleId;
  config: Record<string, unknown>;
}

export async function updateUpdateSchedule(
  client: APIClient,
  params: UpdateUpdateScheduleParams,
): Promise<CommandResult<unknown>> {
  const data = await client.updateUpdateSchedule(params.id, params.config);
  return { data };
}

export interface DeleteUpdateScheduleParams {
  id: UpdateScheduleId;
}

export async function deleteUpdateSchedule(
  client: APIClient,
  params: DeleteUpdateScheduleParams,
): Promise<CommandResult<unknown>> {
  await client.deleteUpdateSchedule(params.id);
  return { data: { id: params.id } };
}
