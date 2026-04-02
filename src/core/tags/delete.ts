import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';

export interface DeleteTagParams {
  id: TagId;
}

export async function deleteTag(
  client: APIClient,
  params: DeleteTagParams
): Promise<CommandResult<unknown>> {
  await client.deleteExperimentTag(params.id);
  return { data: { id: params.id } };
}
