import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export async function listActionDialogFields(client: APIClient): Promise<CommandResult<unknown>> {
  const data = await client.listExperimentActionDialogFields();
  return { data };
}

export interface GetActionDialogFieldParams {
  id: number;
}

export async function getActionDialogField(
  client: APIClient,
  params: GetActionDialogFieldParams
): Promise<CommandResult<unknown>> {
  const data = await client.getExperimentActionDialogField(params.id);
  return { data };
}

export interface CreateActionDialogFieldParams {
  config: Record<string, unknown>;
}

export async function createActionDialogField(
  client: APIClient,
  params: CreateActionDialogFieldParams
): Promise<CommandResult<unknown>> {
  const data = await client.createExperimentActionDialogField(params.config);
  return { data };
}

export interface UpdateActionDialogFieldParams {
  id: number;
  config: Record<string, unknown>;
}

export async function updateActionDialogField(
  client: APIClient,
  params: UpdateActionDialogFieldParams
): Promise<CommandResult<unknown>> {
  const data = await client.updateExperimentActionDialogField(params.id, params.config);
  return { data };
}
