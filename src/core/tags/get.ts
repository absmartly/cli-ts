import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';

export interface GetTagParams {
  id: TagId;
}

export async function getTag(
  client: APIClient,
  params: GetTagParams
): Promise<CommandResult<unknown>> {
  const data = await client.getExperimentTag(params.id);
  return { data };
}
