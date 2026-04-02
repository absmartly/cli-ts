import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

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
