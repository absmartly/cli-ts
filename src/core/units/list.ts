import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface ListUnitsParams {
  items: number;
  page: number;
}

export async function listUnits(
  client: APIClient,
  params: ListUnitsParams
): Promise<CommandResult<unknown[]>> {
  const data = await client.listUnitTypes(params.items, params.page);
  return { data };
}
