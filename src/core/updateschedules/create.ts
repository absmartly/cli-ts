import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateUpdateScheduleParams {
  config: Record<string, unknown>;
}

export async function createUpdateSchedule(
  client: APIClient,
  params: CreateUpdateScheduleParams
): Promise<CommandResult<unknown>> {
  const data = await client.createUpdateSchedule(params.config);
  return { data };
}
