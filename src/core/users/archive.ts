import type { APIClient } from '../../api-client/api-client.js';
import type { UserId } from '../../lib/api/branded-types.js';
import type { CommandResult } from '../types.js';

export interface ArchiveUserParams {
  id: UserId;
  unarchive?: boolean | undefined;
}

export async function archiveUser(
  client: APIClient,
  params: ArchiveUserParams,
): Promise<CommandResult<void>> {
  await client.archiveUser(params.id, params.unarchive);
  return { data: undefined };
}
