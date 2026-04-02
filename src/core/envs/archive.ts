import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { EnvironmentId } from '../../lib/api/branded-types.js';

export interface ArchiveEnvParams {
  id: EnvironmentId;
  unarchive?: boolean | undefined;
}

export async function archiveEnv(
  client: APIClient,
  params: ArchiveEnvParams
): Promise<CommandResult<unknown>> {
  await client.archiveEnvironment(params.id, params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}
