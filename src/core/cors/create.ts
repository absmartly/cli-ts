import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';

export interface CreateCorsOriginParams {
  origin: string;
}

export async function createCorsOrigin(
  client: APIClient,
  params: CreateCorsOriginParams
): Promise<CommandResult<unknown>> {
  const data = await client.createCorsOrigin({ origin: params.origin });
  return { data };
}
