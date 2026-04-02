import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';

export interface DeleteGoalTagParams {
  id: TagId;
}

export async function deleteGoalTag(
  client: APIClient,
  params: DeleteGoalTagParams
): Promise<CommandResult<unknown>> {
  await client.deleteGoalTag(params.id);
  return { data: { id: params.id } };
}
