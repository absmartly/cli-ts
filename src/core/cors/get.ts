import type { APIClient } from '../../api-client/api-client.js';
import type { CommandResult } from '../types.js';
import type { CorsOriginId } from '../../lib/api/branded-types.js';

export interface GetCorsOriginParams {
  id: CorsOriginId;
}

export async function getCorsOrigin(
  client: APIClient,
  params: GetCorsOriginParams
): Promise<CommandResult<unknown>> {
  const data = await client.getCorsOrigin(params.id);
  return { data };
}
