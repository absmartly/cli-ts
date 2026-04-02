import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { CustomSectionId } from '../../lib/api/branded-types.js';

export interface ArchiveCustomSectionParams {
  id: CustomSectionId;
  unarchive?: boolean | undefined;
}

export async function archiveCustomSection(
  client: APIClient,
  params: ArchiveCustomSectionParams
): Promise<CommandResult<unknown>> {
  await client.archiveCustomSection(params.id, !!params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}
