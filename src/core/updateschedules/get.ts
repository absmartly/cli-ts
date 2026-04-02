import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { UpdateScheduleId } from '../../lib/api/branded-types.js';

export interface GetUpdateScheduleParams {
  id: UpdateScheduleId;
}

export async function getUpdateSchedule(
  client: APIClient,
  params: GetUpdateScheduleParams
): Promise<CommandResult<unknown>> {
  const data = await client.getUpdateSchedule(params.id);
  return { data };
}
