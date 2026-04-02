import type { APIClient } from '../../api-client/api-client.js';
import type { GoalId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface UpdateGoalParams {
  id: GoalId;
  description?: string | undefined;
}

export async function updateGoal(
  client: APIClient,
  params: UpdateGoalParams,
): Promise<CommandResult<void>> {
  const data: Record<string, string> = {};
  if (params.description !== undefined) data.description = params.description;

  if (Object.keys(data).length === 0) {
    throw new Error('At least one update field is required');
  }

  await client.updateGoal(params.id, data);
  return { data: undefined };
}
