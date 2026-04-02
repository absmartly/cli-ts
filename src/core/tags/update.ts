import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface UpdateTagParams {
  id: TagId;
  tag?: string | undefined;
}

export async function updateTag(
  client: APIClient,
  params: UpdateTagParams
): Promise<CommandResult<unknown>> {
  const data: { tag?: string } = {};
  if (params.tag) data.tag = params.tag;

  requireAtLeastOneField(data, 'update field');
  const result = await client.updateExperimentTag(params.id, data as { tag: string });
  return { data: result };
}
