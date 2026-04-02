import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ApplicationId } from '../../lib/api/branded-types.js';

export interface ArchiveAppParams {
  id: ApplicationId;
  unarchive?: boolean | undefined;
}

export async function archiveApp(
  client: APIClient,
  params: ArchiveAppParams
): Promise<CommandResult<unknown>> {
  await client.archiveApplication(params.id, params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}
