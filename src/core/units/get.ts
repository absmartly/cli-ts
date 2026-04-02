import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { UnitTypeId } from '../../lib/api/branded-types.js';

export interface GetUnitParams {
  id: UnitTypeId;
}

export async function getUnit(
  client: APIClient,
  params: GetUnitParams
): Promise<CommandResult<unknown>> {
  const data = await client.getUnitType(params.id);
  return { data };
}
