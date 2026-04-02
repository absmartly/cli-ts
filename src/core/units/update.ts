import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { UnitTypeId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface UpdateUnitParams {
  id: UnitTypeId;
  name?: string | undefined;
  description?: string | undefined;
}

export async function updateUnit(
  client: APIClient,
  params: UpdateUnitParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, unknown> = {};
  if (params.name) data.name = params.name;
  if (params.description) data.description = params.description;

  requireAtLeastOneField(data, 'update field');
  await client.updateUnitType(params.id, data);
  return { data: { id: params.id } };
}
