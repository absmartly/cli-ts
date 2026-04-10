import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateGoalParams {
  name: string;
  description?: string | undefined;
}

export async function createGoal(
  client: APIClient,
  params: CreateGoalParams
): Promise<CommandResult<{ id: number }>> {
  const payload: Record<string, unknown> = { name: params.name };
  if (params.description !== undefined) payload.description = params.description;
  const data = await client.createGoal(payload);
  return { data: data as { id: number } };
}
