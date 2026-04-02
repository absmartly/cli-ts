import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateEnvParams {
  name: string;
}

export async function createEnv(
  client: APIClient,
  params: CreateEnvParams
): Promise<CommandResult<unknown>> {
  const data = await client.createEnvironment({ name: params.name });
  return { data };
}
