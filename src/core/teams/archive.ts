import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { TeamId } from '../../lib/api/branded-types.js';

export interface ArchiveTeamParams {
  id: TeamId;
  unarchive?: boolean | undefined;
}

export async function archiveTeam(
  client: APIClient,
  params: ArchiveTeamParams
): Promise<CommandResult<unknown>> {
  await client.archiveTeam(params.id, params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}
