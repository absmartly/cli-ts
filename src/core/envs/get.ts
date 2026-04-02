import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { EnvironmentId } from '../../lib/api/branded-types.js';

export interface GetEnvParams {
  id: EnvironmentId;
}

export async function getEnv(
  client: APIClient,
  params: GetEnvParams
): Promise<CommandResult<unknown>> {
  const data = await client.getEnvironment(params.id);
  return { data };
}
