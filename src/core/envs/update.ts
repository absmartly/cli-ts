import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { EnvironmentId } from '../../lib/api/branded-types.js';
import { requireAtLeastOneField } from '../../lib/utils/validators.js';

export interface UpdateEnvParams {
  id: EnvironmentId;
  name?: string | undefined;
}

export async function updateEnv(
  client: APIClient,
  params: UpdateEnvParams
): Promise<CommandResult<unknown>> {
  const data: Record<string, unknown> = {};
  if (params.name !== undefined) data.name = params.name;

  requireAtLeastOneField(data, 'update field');
  await client.updateEnvironment(params.id, data);
  return { data: { id: params.id } };
}
