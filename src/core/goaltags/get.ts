import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';

export interface GetGoalTagParams {
  id: TagId;
}

export async function getGoalTag(
  client: APIClient,
  params: GetGoalTagParams
): Promise<CommandResult<unknown>> {
  const data = await client.getGoalTag(params.id);
  return { data };
}
