import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { CustomSectionFieldId } from '../../lib/api/branded-types.js';

export interface ArchiveCustomFieldParams {
  id: CustomSectionFieldId;
  unarchive?: boolean | undefined;
}

export async function archiveCustomField(
  client: APIClient,
  params: ArchiveCustomFieldParams
): Promise<CommandResult<unknown>> {
  await client.archiveCustomSectionField(params.id, !!params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}
