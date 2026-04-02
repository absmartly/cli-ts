import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { UpdateScheduleId } from '../../lib/api/branded-types.js';

export interface DeleteUpdateScheduleParams {
  id: UpdateScheduleId;
}

export async function deleteUpdateSchedule(
  client: APIClient,
  params: DeleteUpdateScheduleParams
): Promise<CommandResult<unknown>> {
  await client.deleteUpdateSchedule(params.id);
  return { data: { id: params.id } };
}
