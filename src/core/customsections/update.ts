import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { CustomSectionId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface UpdateCustomSectionParams {
  id: CustomSectionId;
  name?: string | undefined;
}

export async function updateCustomSection(
  client: APIClient,
  params: UpdateCustomSectionParams
): Promise<CommandResult<unknown>> {
  const payload: Record<string, unknown> = {};
  if (params.name !== undefined) payload.name = params.name;

  requireAtLeastOneField(payload, 'update field');
  const data = await client.updateCustomSection(params.id, payload);
  return { data };
}
