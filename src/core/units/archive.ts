import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { UnitTypeId } from '../../lib/api/branded-types.js';

export interface ArchiveUnitParams {
  id: UnitTypeId;
  unarchive?: boolean | undefined;
}

export async function archiveUnit(
  client: APIClient,
  params: ArchiveUnitParams
): Promise<CommandResult<unknown>> {
  await client.archiveUnitType(params.id, params.unarchive);
  return { data: { id: params.id, archived: !params.unarchive } };
}
