import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateGoalTagParams {
  tag: string;
}

export async function createGoalTag(
  client: APIClient,
  params: CreateGoalTagParams
): Promise<CommandResult<unknown>> {
  const data = await client.createGoalTag({ tag: params.tag });
  return { data };
}
