import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateUnitParams {
  name: string;
  description?: string | undefined;
}

export async function createUnit(
  client: APIClient,
  params: CreateUnitParams
): Promise<CommandResult<unknown>> {
  const payload: Record<string, unknown> = { name: params.name };
  if (params.description) payload.description = params.description;
  const data = await client.createUnitType(payload as { name: string });
  return { data };
}
