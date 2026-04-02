import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

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
  const data = await client.createMetricCategory(payload as { name: string; description?: string; color: string });
  return { data };
}
