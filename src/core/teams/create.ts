import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateTeamParams {
  name: string;
  description?: string | undefined;
}

export async function createTeam(
  client: APIClient,
  params: CreateTeamParams
): Promise<CommandResult<unknown>> {
  const payload: Record<string, unknown> = { name: params.name };
  if (params.description !== undefined) payload.description = params.description;
  const data = await client.createTeam(payload);
  return { data };
}
