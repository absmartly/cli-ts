import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TagId } from '../../lib/api/branded-types.js';

export interface ArchiveMetricCategoryParams {
  id: TagId;
  unarchive?: boolean | undefined;
}

export async function archiveMetricCategory(
  client: APIClient,
  params: ArchiveMetricCategoryParams
): Promise<CommandResult<unknown>> {
  await client.archiveMetricCategory(params.id, !params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}
