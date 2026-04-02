import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { CustomSectionField } from '../../api-client/types.js';

export interface CreateCustomFieldParams {
  name: string;
  type: string;
  defaultValue?: string | undefined;
}

export async function createCustomField(
  client: APIClient,
  params: CreateCustomFieldParams
): Promise<CommandResult<unknown>> {
  const payload: Partial<CustomSectionField> = {
    name: params.name,
    type: params.type,
  };
  if (params.defaultValue !== undefined) payload.default_value = params.defaultValue;

  const data = await client.createCustomSectionField(payload);
  return { data };
}
