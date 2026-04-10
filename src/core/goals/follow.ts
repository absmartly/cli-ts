import type { APIClient } from '../../api-client/api-client.js';
import type { GoalId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface FollowGoalParams {
  id: GoalId;
}

export async function followGoal(
  client: APIClient,
  params: FollowGoalParams
): Promise<CommandResult<void>> {
  await client.followGoal(params.id);
  return { data: undefined };
}

export interface UnfollowGoalParams {
  id: GoalId;
}

export async function unfollowGoal(
  client: APIClient,
  params: UnfollowGoalParams
): Promise<CommandResult<void>> {
  await client.unfollowGoal(params.id);
  return { data: undefined };
}
