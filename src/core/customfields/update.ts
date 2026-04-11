import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { CustomSectionFieldId } from '../../lib/api/branded-types.js';
import type { CustomSectionField } from '../../api-client/types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface UpdateCustomFieldParams {
  id: CustomSectionFieldId;
  name?: string | undefined;
  type?: string | undefined;
  defaultValue?: string | undefined;
}

export async function updateCustomField(
  client: APIClient,
  params: UpdateCustomFieldParams
): Promise<CommandResult<unknown>> {
  const payload: Partial<CustomSectionField> = {};
  if (params.name !== undefined) payload.name = params.name;
  if (params.type !== undefined) payload.type = params.type;
  if (params.defaultValue !== undefined) payload.default_value = params.defaultValue;

  requireAtLeastOneField(payload as Record<string, unknown>, 'update field');
  const data = await client.updateCustomSectionField(params.id, payload);
  return { data };
}
