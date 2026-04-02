import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { UpdateScheduleId } from '../../lib/api/branded-types.js';

export interface UpdateUpdateScheduleParams {
  id: UpdateScheduleId;
  config: Record<string, unknown>;
}

export async function updateUpdateSchedule(
  client: APIClient,
  params: UpdateUpdateScheduleParams
): Promise<CommandResult<unknown>> {
  const data = await client.updateUpdateSchedule(params.id, params.config);
  return { data };
}
