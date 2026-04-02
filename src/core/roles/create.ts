import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

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
