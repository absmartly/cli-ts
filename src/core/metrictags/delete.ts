import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';

export interface DeleteMetricTagParams {
  id: TagId;
}

export async function deleteMetricTag(
  client: APIClient,
  params: DeleteMetricTagParams
): Promise<CommandResult<unknown>> {
  await client.deleteMetricTag(params.id);
  return { data: { id: params.id } };
}
