import type { APIClient } from '../../api-client/api-client.js';
import type { GoalId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface GetGoalParams {
  id: GoalId;
}

export async function getGoal(
  client: APIClient,
  params: GetGoalParams,
): Promise<CommandResult<unknown>> {
  const data = await client.getGoal(params.id);
  return { data };
}
