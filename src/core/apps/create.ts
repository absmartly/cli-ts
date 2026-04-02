import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateAppParams {
  name: string;
}

export async function createApp(
  client: APIClient,
  params: CreateAppParams
): Promise<CommandResult<unknown>> {
  const data = await client.createApplication({ name: params.name });
  return { data };
}
