import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { ApplicationId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface UpdateAppParams {
  id: ApplicationId;
  name?: string | undefined;
}

export async function updateApp(
  client: APIClient,
  params: UpdateAppParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, unknown> = {};
  if (params.name) data.name = params.name;

  requireAtLeastOneField(data, 'update field');
  await client.updateApplication(params.id, data);
  return { data: { id: params.id } };
}
